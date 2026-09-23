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
    decimal Density,
    int? MaterialTypeId = null,
    string? MaterialTypeName = null
);

public record ItemConfigRowDto(
    int? SkuId,
    string Spec,
    string Variant,
    int? CategoryId,
    string? CategoryName,
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
            .Include(m => m.MaterialType)
            .OrderBy(m => m.Id)
            .ToListAsync(cancellationToken);

        var materialDtos = materials
            .Where(m => m.MaterialType != null && !string.IsNullOrWhiteSpace(m.MaterialType.Name))
            .Select(m => new ItemConfigMaterialDto(
                m.Id,
                m.Name,
                m.MaterialType!.Name.Trim(),
                m.Density,
                m.MaterialTypeId,
                m.MaterialType.Name.Trim()
            )).ToList();

        // Dynamically extract all distinct material types from materials in database
        var dynamicCategories = materials
            .Where(m => m.MaterialType != null && !string.IsNullOrWhiteSpace(m.MaterialType.Name))
            .Select(m => m.MaterialType!.Name.Trim())
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
                null,
                null,
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
