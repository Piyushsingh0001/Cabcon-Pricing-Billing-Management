using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.ItemConfiguration;

public record ItemConfigCategoryDto(string Name, List<ItemConfigMaterialDto> Materials);

public record ItemConfigMaterialDto(
    int Id,
    string Name,
    string CategoryName,
    decimal Density
);

public record ItemConfigRowDto(
    int? SkuId,
    string Spec,
    string Variant,
    int CategoryId,
    string CategoryName,
    Dictionary<int, decimal> Weights
);

public record ItemConfigMatrixDto(
    List<string> StandardCategories,
    List<ItemConfigMaterialDto> Materials,
    List<ItemConfigRowDto> Rows
);

public record GetItemConfigurationMatrixQuery : IRequest<Result<ItemConfigMatrixDto>>;

public class GetItemConfigurationMatrixQueryHandler : IRequestHandler<GetItemConfigurationMatrixQuery, Result<ItemConfigMatrixDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    private static readonly string[] DefaultCategoryOrder = new[]
    {
        "Core Material",
        "Insulation Material",
        "Inner Sheath",
        "Armour Wire",
        "PVC Outer Sheath"
    };

    public GetItemConfigurationMatrixQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<ItemConfigMatrixDto>> Handle(GetItemConfigurationMatrixQuery request, CancellationToken cancellationToken)
    {
        var materialRepo = _unitOfWork.Repository<Material>();
        var materials = await materialRepo.Query()
            .OrderBy(m => m.Id)
            .ToListAsync(cancellationToken);

        // If no categorized materials exist, seed or classify existing materials
        if (materials.Count == 0 || materials.All(m => string.IsNullOrEmpty(m.CategoryName)))
        {
            await EnsureDefaultMaterialsAsync(materials, materialRepo, cancellationToken);
            materials = await materialRepo.Query()
                .OrderBy(m => m.Id)
                .ToListAsync(cancellationToken);
        }

        // Migrate any legacy 'PVC Outer Shell' to 'PVC Outer Sheath'
        bool needsSave = false;
        foreach (var m in materials)
        {
            if (string.Equals(m.CategoryName, "PVC Outer Shell", StringComparison.OrdinalIgnoreCase))
            {
                m.CategoryName = "PVC Outer Sheath";
                materialRepo.Update(m);
                needsSave = true;
            }
        }
        if (needsSave)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        var materialDtos = materials.Select(m => new ItemConfigMaterialDto(
            m.Id,
            m.Name,
            string.IsNullOrWhiteSpace(m.CategoryName) ? "Core Material" : m.CategoryName,
            m.Density
        )).ToList();

        // Dynamically extract all distinct categories from materials
        var dynamicCategories = materials
            .Where(m => !string.IsNullOrWhiteSpace(m.CategoryName))
            .Select(m => m.CategoryName!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var standardCategoriesList = new List<string>();
        foreach (var defCat in DefaultCategoryOrder)
        {
            var matched = dynamicCategories.FirstOrDefault(c => c.Equals(defCat, StringComparison.OrdinalIgnoreCase));
            standardCategoriesList.Add(matched ?? defCat);
        }
        foreach (var dynCat in dynamicCategories)
        {
            if (!standardCategoriesList.Any(c => c.Equals(dynCat, StringComparison.OrdinalIgnoreCase)))
            {
                standardCategoriesList.Add(dynCat);
            }
        }

        var skuRepo = _unitOfWork.Repository<Sku>();
        var skus = await skuRepo.Query()
            .Include(s => s.Category)
            .Include(s => s.BomLines)
            .OrderBy(s => s.CategoryId)
            .ThenBy(s => s.Name)
            .ThenBy(s => s.Spec)
            .ToListAsync(cancellationToken);

        var rows = new List<ItemConfigRowDto>();
        foreach (var sku in skus)
        {
            var weightsMap = new Dictionary<int, decimal>();
            foreach (var bom in sku.BomLines)
            {
                weightsMap[bom.MaterialId] = bom.WeightKg;
            }

            rows.Add(new ItemConfigRowDto(
                sku.Id,
                sku.Spec,
                sku.Name,
                sku.CategoryId,
                sku.Category?.Name ?? "General",
                weightsMap
            ));
        }

        var result = new ItemConfigMatrixDto(
            standardCategoriesList,
            materialDtos,
            rows
        );

        return Result<ItemConfigMatrixDto>.Success(result);
    }

    private async Task EnsureDefaultMaterialsAsync(List<Material> existing, IRepository<Material> materialRepo, CancellationToken cancellationToken)
    {
        var defaultList = new (string Name, string Category, decimal Density)[]
        {
            ("AL", "Core Material", 2.703m),
            ("CU", "Core Material", 8.89m),
            ("LT XLPE", "Insulation Material", 0.92m),
            ("PVC-A(INS)", "Insulation Material", 1.40m),
            ("PVC-C(INS)", "Insulation Material", 1.42m),
            ("PVC-ST-2 (I/SH)", "Inner Sheath", 1.45m),
            ("PVC-FRLSH(I/SH)", "Inner Sheath", 1.48m),
            ("AL ARMOUR", "Armour Wire", 2.703m),
            ("G.S. ARMOUR", "Armour Wire", 7.85m),
            ("PVC-ST-2 FRLSH (O/SH)", "PVC Outer Sheath", 1.45m)
        };

        bool hasChanges = false;
        foreach (var (name, cat, density) in defaultList)
        {
            var match = existing.FirstOrDefault(m => m.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (match != null)
            {
                if (string.IsNullOrEmpty(match.CategoryName) || match.Density == 0)
                {
                    match.CategoryName = cat;
                    match.Density = density;
                    materialRepo.Update(match);
                    hasChanges = true;
                }
            }
            else
            {
                var newMat = new Material
                {
                    Name = name,
                    CategoryName = cat,
                    Density = density
                };
                await materialRepo.AddAsync(newMat, cancellationToken);
                hasChanges = true;
            }
        }

        if (hasChanges)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }
}
