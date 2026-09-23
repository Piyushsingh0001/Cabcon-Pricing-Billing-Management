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
    string? CategoryName,
    decimal Density,
    int? MaterialTypeId = null,
    string? MaterialTypeName = null
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
        var matTypeRepo = _unitOfWork.Repository<MaterialType>();

        var existingMaterials = await materialRepo.Query()
            .Include(m => m.MaterialType)
            .ToListAsync(cancellationToken);

        var existingMaterialTypes = await matTypeRepo.Query()
            .ToListAsync(cancellationToken);

        var materialTypeMap = new Dictionary<string, MaterialType>(StringComparer.OrdinalIgnoreCase);
        foreach (var mt in existingMaterialTypes)
        {
            materialTypeMap[mt.Name] = mt;
        }

        var activeMaterialIds = new HashSet<int>();

        // Helper to resolve MaterialTypeId
        async Task<int?> ResolveMaterialTypeIdAsync(int? typeId, string? typeName, string? catName)
        {
            if (typeId.HasValue && typeId.Value > 0) return typeId.Value;

            var name = (typeName ?? catName)?.Trim();
            if (string.IsNullOrWhiteSpace(name)) return null;

            if (materialTypeMap.TryGetValue(name, out var foundType))
            {
                return foundType.Id;
            }

            var newType = new MaterialType
            {
                Name = name,
                IsActive = true
            };
            await matTypeRepo.AddAsync(newType, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            materialTypeMap[name] = newType;
            return newType.Id;
        }

        // 1. Sync Materials
        foreach (var matInput in request.Materials)
        {
            var trimmedName = matInput.Name.Trim();
            var resolvedTypeId = await ResolveMaterialTypeIdAsync(matInput.MaterialTypeId, matInput.MaterialTypeName, matInput.CategoryName);

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
                if (resolvedTypeId.HasValue)
                {
                    targetMaterial.MaterialTypeId = resolvedTypeId.Value;
                }
                targetMaterial.Density = matInput.Density;
                materialRepo.Update(targetMaterial);
                activeMaterialIds.Add(targetMaterial.Id);
            }
            else
            {
                var newMaterial = new Material
                {
                    Name = trimmedName,
                    MaterialTypeId = resolvedTypeId,
                    Density = matInput.Density
                };
                await materialRepo.AddAsync(newMaterial, cancellationToken);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Re-query materials to ensure all generated IDs are loaded
        var allSavedMaterials = await materialRepo.Query().ToListAsync(cancellationToken);
        var materialIdMap = allSavedMaterials.ToDictionary(m => m.Id, m => m);

        // 2. Sync WeightMatrixRows and WeightMatrixWeights
        var matrixRowRepo = _unitOfWork.Repository<WeightMatrixRow>();
        var existingMatrixRows = await matrixRowRepo.Query()
            .Include(r => r.Weights)
            .ToListAsync(cancellationToken);

        var retainedRowIds = new HashSet<int>();
        int sortOrder = 0;

        foreach (var row in request.Rows)
        {
            var specTrimmed = row.Spec.Trim();
            var variantTrimmed = row.Variant.Trim();
            if (string.IsNullOrEmpty(specTrimmed) && string.IsNullOrEmpty(variantTrimmed))
            {
                continue;
            }

            WeightMatrixRow? matrixRow = null;
            if (row.SkuId.HasValue && row.SkuId.Value > 0)
            {
                matrixRow = existingMatrixRows.FirstOrDefault(r => r.Id == row.SkuId.Value);
            }

            if (matrixRow == null)
            {
                matrixRow = existingMatrixRows.FirstOrDefault(r =>
                    r.Spec.Equals(specTrimmed, StringComparison.OrdinalIgnoreCase) &&
                    r.Variant.Equals(variantTrimmed, StringComparison.OrdinalIgnoreCase));
            }

            if (matrixRow == null)
            {
                matrixRow = new WeightMatrixRow
                {
                    Spec = specTrimmed,
                    Variant = variantTrimmed,
                    SortOrder = ++sortOrder
                };
                await matrixRowRepo.AddAsync(matrixRow, cancellationToken);
            }
            else
            {
                matrixRow.Spec = specTrimmed;
                matrixRow.Variant = variantTrimmed;
                matrixRow.SortOrder = ++sortOrder;
                matrixRowRepo.Update(matrixRow);
                retainedRowIds.Add(matrixRow.Id);
            }

            // Clear and rebuild weights for this matrix row
            matrixRow.Weights.Clear();

            if (row.Weights != null)
            {
                foreach (var kvp in row.Weights)
                {
                    var materialId = kvp.Key;
                    var weight = kvp.Value;

                    if (weight > 0 && materialIdMap.ContainsKey(materialId))
                    {
                        matrixRow.Weights.Add(new WeightMatrixWeight
                        {
                            WeightMatrixRowId = matrixRow.Id,
                            MaterialId = materialId,
                            WeightKg = weight
                        });
                    }
                }
            }
        }

        // 3. Delete any existing matrix rows that were deleted from the matrix
        foreach (var existingRow in existingMatrixRows)
        {
            if (!retainedRowIds.Contains(existingRow.Id))
            {
                matrixRowRepo.Delete(existingRow);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
