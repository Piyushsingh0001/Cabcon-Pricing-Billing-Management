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

        // Migrate any legacy 'PVC Outer Shell' to 'PVC Outer Sheath' if exists
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

        // Dynamically extract all distinct categories from materials in database
        var dynamicCategories = materials
            .Where(m => !string.IsNullOrWhiteSpace(m.CategoryName))
            .Select(m => m.CategoryName!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(c => c)
            .ToList();

        var matrixRowRepo = _unitOfWork.Repository<WeightMatrixRow>();
        var matrixRows = await matrixRowRepo.Query()
            .Include(r => r.Weights)
            .OrderBy(r => r.SortOrder)
            .ThenBy(r => r.Id)
            .ToListAsync(cancellationToken);

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
            dynamicCategories,
            materialDtos,
            rows
        );

        return Result<ItemConfigMatrixDto>.Success(result);
    }
}
