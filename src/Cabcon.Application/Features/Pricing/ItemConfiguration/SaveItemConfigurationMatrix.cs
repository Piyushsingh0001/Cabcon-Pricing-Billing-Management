using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Cabcon.Shared.Wrappers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.ItemConfiguration;

public record SaveItemConfigMaterialInput(
    int? Id,
    string Name,
    string CategoryName,
    decimal Density
);

public record SaveItemConfigRowInput(
    int? SkuId,
    string Spec,
    string Variant,
    int? CategoryId,
    Dictionary<int, decimal> Weights
);

public record SaveItemConfigurationMatrixCommand(
    List<SaveItemConfigMaterialInput> Materials,
    List<SaveItemConfigRowInput> Rows
) : IRequest<Result>;

public class SaveItemConfigurationMatrixCommandValidator : AbstractValidator<SaveItemConfigurationMatrixCommand>
{
    public SaveItemConfigurationMatrixCommandValidator()
    {
        RuleFor(x => x.Materials).NotNull();
        RuleFor(x => x.Rows).NotNull();
        RuleForEach(x => x.Materials).ChildRules(m =>
        {
            m.RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
            m.RuleFor(x => x.CategoryName).NotEmpty().MaximumLength(150);
            m.RuleFor(x => x.Density).GreaterThanOrEqualTo(0);
        });
        RuleForEach(x => x.Rows).ChildRules(r =>
        {
            r.RuleFor(x => x.Spec).NotEmpty().MaximumLength(100);
            r.RuleFor(x => x.Variant).NotEmpty().MaximumLength(200);
        });
    }
}

public class SaveItemConfigurationMatrixCommandHandler : IRequestHandler<SaveItemConfigurationMatrixCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;

    public SaveItemConfigurationMatrixCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(SaveItemConfigurationMatrixCommand request, CancellationToken cancellationToken)
    {
        var materialRepo = _unitOfWork.Repository<Material>();
        var existingMaterials = await materialRepo.Query().ToListAsync(cancellationToken);

        var materialMap = new Dictionary<string, Material>(StringComparer.OrdinalIgnoreCase);

        // 1. Sync Materials
        foreach (var matInput in request.Materials)
        {
            var trimmedName = matInput.Name.Trim();
            var trimmedCategory = matInput.CategoryName.Trim();

            Material? targetMaterial = null;
            if (matInput.Id.HasValue && matInput.Id.Value > 0)
            {
                targetMaterial = existingMaterials.FirstOrDefault(m => m.Id == matInput.Id.Value);
            }

            if (targetMaterial == null)
            {
                targetMaterial = existingMaterials.FirstOrDefault(m => m.Name.Equals(trimmedName, StringComparison.OrdinalIgnoreCase));
            }

            if (targetMaterial != null)
            {
                targetMaterial.Name = trimmedName;
                targetMaterial.CategoryName = trimmedCategory;
                targetMaterial.Density = matInput.Density;
                materialRepo.Update(targetMaterial);
                materialMap[trimmedName] = targetMaterial;
            }
            else
            {
                var newMaterial = new Material
                {
                    Name = trimmedName,
                    CategoryName = trimmedCategory,
                    Density = matInput.Density
                };
                await materialRepo.AddAsync(newMaterial, cancellationToken);
                materialMap[trimmedName] = newMaterial;
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Re-query materials to ensure all generated IDs are loaded
        var allSavedMaterials = await materialRepo.Query().ToListAsync(cancellationToken);
        var materialIdMap = allSavedMaterials.ToDictionary(m => m.Id, m => m);

        // 2. Ensure default product Category exists
        var categoryRepo = _unitOfWork.Repository<Category>();
        var defaultCategory = await categoryRepo.Query().FirstOrDefaultAsync(cancellationToken);
        if (defaultCategory == null)
        {
            defaultCategory = new Category { Name = "LT Cable" };
            await categoryRepo.AddAsync(defaultCategory, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        // 3. Sync SKUs and BOM lines
        var skuRepo = _unitOfWork.Repository<Sku>();
        var existingSkus = await skuRepo.Query()
            .Include(s => s.BomLines)
            .ToListAsync(cancellationToken);

        foreach (var row in request.Rows)
        {
            var specTrimmed = row.Spec.Trim();
            var variantTrimmed = row.Variant.Trim();
            if (string.IsNullOrEmpty(specTrimmed) && string.IsNullOrEmpty(variantTrimmed))
            {
                continue;
            }

            Sku? sku = null;
            if (row.SkuId.HasValue && row.SkuId.Value > 0)
            {
                sku = existingSkus.FirstOrDefault(s => s.Id == row.SkuId.Value);
            }

            if (sku == null)
            {
                sku = existingSkus.FirstOrDefault(s =>
                    s.Spec.Equals(specTrimmed, StringComparison.OrdinalIgnoreCase) &&
                    s.Name.Equals(variantTrimmed, StringComparison.OrdinalIgnoreCase));
            }

            int targetCategoryId = (row.CategoryId.HasValue && row.CategoryId.Value > 0)
                ? row.CategoryId.Value
                : (sku?.CategoryId ?? defaultCategory.Id);

            if (sku == null)
            {
                sku = new Sku
                {
                    CategoryId = targetCategoryId,
                    Name = variantTrimmed,
                    Spec = specTrimmed,
                    Unit = "km",
                    ConversionType = ConversionType.PerKg,
                    ConversionValue = 25m,
                    GstRate = 0.18m,
                    Quantity = 1m,
                    IsPlaceholder = false
                };
                await skuRepo.AddAsync(sku, cancellationToken);
            }
            else
            {
                sku.Spec = specTrimmed;
                sku.Name = variantTrimmed;
                sku.CategoryId = targetCategoryId;
                sku.Unit = string.IsNullOrWhiteSpace(sku.Unit) ? "km" : sku.Unit;
                sku.IsPlaceholder = false;
                skuRepo.Update(sku);
            }

            // Clear and rebuild BOM lines for this SKU
            sku.BomLines.Clear();

            int lineOrder = 0;
            if (row.Weights != null)
            {
                foreach (var kvp in row.Weights)
                {
                    var materialId = kvp.Key;
                    var weight = kvp.Value;

                    if (weight > 0 && materialIdMap.ContainsKey(materialId))
                    {
                        sku.BomLines.Add(new SkuBomLine
                        {
                            SkuId = sku.Id,
                            MaterialId = materialId,
                            WeightKg = weight,
                            PriceType = MaterialType.Exchange,
                            PricingMethod = BomPricingMethod.Actual,
                            LineOrder = ++lineOrder
                        });
                    }
                }
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
