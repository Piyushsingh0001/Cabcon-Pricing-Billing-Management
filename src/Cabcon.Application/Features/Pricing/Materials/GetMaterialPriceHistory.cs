using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Materials;

public record MaterialPriceHistoryDto
{
    public int Id { get; init; }
    public decimal? LmeUsdPerMt { get; init; }
    public decimal? PremiumUsdPerMt { get; init; }
    public decimal? FxRate { get; init; }
    public decimal? FreightInrPerMt { get; init; }
    public decimal? DirectRateInrPerKg { get; init; }
    public decimal LandedCostInrPerKg { get; init; }
    public DateTime EffectiveDate { get; init; }
    public string? UpdatedBy { get; init; }
    public Cabcon.Domain.Enums.MaterialType Type { get; init; }
}

public record GetMaterialPriceHistoryQuery(int MaterialId) : IRequest<IReadOnlyList<MaterialPriceHistoryDto>>;

public class GetMaterialPriceHistoryQueryHandler : IRequestHandler<GetMaterialPriceHistoryQuery, IReadOnlyList<MaterialPriceHistoryDto>>
{
    private readonly IRepository<MaterialPriceHistory> _repository;

    public GetMaterialPriceHistoryQueryHandler(IRepository<MaterialPriceHistory> repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<MaterialPriceHistoryDto>> Handle(GetMaterialPriceHistoryQuery request, CancellationToken cancellationToken)
    {
        return await _repository.Query()
            .Where(x => x.MaterialId == request.MaterialId)
            .OrderByDescending(x => x.EffectiveDate)
            .Select(x => new MaterialPriceHistoryDto
            {
                Id = x.Id,
                LmeUsdPerMt = x.LmeUsdPerMt,
                PremiumUsdPerMt = x.PremiumUsdPerMt,
                FxRate = x.FxRate,
                FreightInrPerMt = x.FreightInrPerMt,
                DirectRateInrPerKg = x.DirectRateInrPerKg,
                LandedCostInrPerKg = x.LandedCostInrPerKg,
                EffectiveDate = x.EffectiveDate,
                UpdatedBy = x.UpdatedBy ?? x.CreatedBy,
                Type = x.Type
            })
            .ToListAsync(cancellationToken);
    }
}
