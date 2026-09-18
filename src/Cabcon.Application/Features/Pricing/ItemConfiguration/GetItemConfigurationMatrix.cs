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

        var materialDtos = materials
            .Where(m => !string.IsNullOrWhiteSpace(m.CategoryName))
            .Select(m => new ItemConfigMaterialDto(
                m.Id,
                m.Name,
                m.CategoryName!.Trim(),
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

        var matrixRowRepo = _unitOfWork.Repository<WeightMatrixRow>();
        var matrixRows = await matrixRowRepo.Query()
            .Include(r => r.Weights)
            .OrderBy(r => r.SortOrder)
            .ThenBy(r => r.Id)
            .ToListAsync(cancellationToken);

        if (matrixRows.Count == 0)
        {
            await EnsureDefaultMatrixRowsAsync(materials, matrixRowRepo, cancellationToken);
            matrixRows = await matrixRowRepo.Query()
                .Include(r => r.Weights)
                .OrderBy(r => r.SortOrder)
                .ThenBy(r => r.Id)
                .ToListAsync(cancellationToken);
        }

        var rows = new List<ItemConfigRowDto>();
        foreach (var r in matrixRows)
        {
            var weightsMap = new Dictionary<int, decimal>();
            foreach (var w in r.Weights)
            {
                weightsMap[w.MaterialId] = w.WeightKg;
            }

            rows.Add(new ItemConfigRowDto(
                r.Id,
                r.Spec,
                r.Variant,
                3,
                "LT Cable",
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

    private async Task EnsureDefaultMatrixRowsAsync(List<Material> materials, IRepository<WeightMatrixRow> matrixRowRepo, CancellationToken cancellationToken)
    {
        var matMap = materials.ToDictionary(m => m.Name.ToUpper(), m => m.Id);

        var sampleData = new (string Spec, string Variant, int? Al, int? Cu, int? Xlpe, int? Ish, int? Gs, int? Osh)[]
        {
            ("2 C X 4 sq.mm.", "2XWY", null, 68, 24, 51, 253, 96),
            ("2 C X 2.5 sq.mm.", "2XWY", null, 44, 15, 44, 210, 83),
            ("3 C X 2.5 sq.mm.", "2XWY", null, 65, 23, 21, 226, 86),
            ("4 C X 2.5 sq.mm.", "2XWY", null, 87, 30, 23, 251, 92),
            ("4 C X 6 sq.mm.", "2XWY", null, 202, 54, 32, 332, 133),
            ("7 C X 2.5 sq.mm.", "2XWY", null, 152, 53, 29, 304, 104),
            ("12 C X 2.5 sq.mm.", "2XFY", null, 261, 90, 38, 236, 142),
            ("19 C X 2.5 sq.mm.", "2XFY", null, 414, 143, 44, 281, 166),
            ("4 C X 16 sq.mm.", "2XFY", null, 533, 76, 42, 317, 157),
            ("3.5 C X 70 sq.mm.", "A2XFY", 623, null, 145, 78, 491, 271),
            ("3.5 C X 300 sq.mm.", "A2XFY", 2670, null, 447, 195, 907, 693)
        };

        int sortOrder = 0;
        foreach (var s in sampleData)
        {
            var row = new WeightMatrixRow
            {
                Spec = s.Spec,
                Variant = s.Variant,
                SortOrder = ++sortOrder
            };

            void AddWeight(string matKey, decimal? weight)
            {
                if (!weight.HasValue || weight.Value <= 0) return;
                var matchedKey = matMap.Keys.FirstOrDefault(k => k.Contains(matKey));
                if (matchedKey != null && matMap.TryGetValue(matchedKey, out var matId))
                {
                    row.Weights.Add(new WeightMatrixWeight
                    {
                        MaterialId = matId,
                        WeightKg = weight.Value
                    });
                }
            }

            AddWeight("AL", s.Al);
            AddWeight("CU", s.Cu);
            AddWeight("XLPE", s.Xlpe);
            AddWeight("PVC-ST-2 (I/SH)", s.Ish);
            AddWeight("G.S. ARMOUR", s.Gs);
            AddWeight("PVC-ST-2 FRLSH (O/SH)", s.Osh);

            await matrixRowRepo.AddAsync(row, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
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
