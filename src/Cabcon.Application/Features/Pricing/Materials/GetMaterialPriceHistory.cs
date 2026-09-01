using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Materials;

public record MaterialPriceHistoryDto
{
    public int Id { get; init; }
    public int? VendorId { get; init; }
    public string? VendorName { get; init; }
    public decimal? LmeUsdPerMt { get; init; }
    public decimal? PremiumUsdPerMt { get; init; }
    public decimal? FxRate { get; init; }
    public decimal? FreightInrPerKg { get; init; }
    public decimal? FreightInrPerMt => FreightInrPerKg * 1000m;
    public decimal? DirectRateInrPerKg { get; init; }
    public decimal LandedCostInrPerKg { get; init; }
    public DateTime EffectiveDate { get; init; }
    public string? UpdatedBy { get; init; }
    public Cabcon.Domain.Enums.MaterialType Type { get; init; }
}

public record GetMaterialPriceHistoryQuery(int MaterialId, Cabcon.Domain.Enums.MaterialType? Type = null) : IRequest<IReadOnlyList<MaterialPriceHistoryDto>>;

public class GetMaterialPriceHistoryQueryHandler : IRequestHandler<GetMaterialPriceHistoryQuery, IReadOnlyList<MaterialPriceHistoryDto>>
{
    private readonly IRepository<MaterialPriceHistory> _repository;

    public GetMaterialPriceHistoryQueryHandler(IRepository<MaterialPriceHistory> repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<MaterialPriceHistoryDto>> Handle(GetMaterialPriceHistoryQuery request, CancellationToken cancellationToken)
    {
        var query = _repository.Query()
            .Include(x => x.Vendor)
            .Where(x => x.MaterialId == request.MaterialId);

        if (request.Type.HasValue)
        {
            query = query.Where(x => x.Type == request.Type.Value);
        }

        return await query
            .OrderByDescending(x => x.EffectiveDate)
            .Select(x => new MaterialPriceHistoryDto
            {
                Id = x.Id,
                VendorId = x.VendorId,
                VendorName = x.Vendor != null ? x.Vendor.Name : null,
                LmeUsdPerMt = x.LmeUsdPerMt,
                PremiumUsdPerMt = x.PremiumUsdPerMt,
                FxRate = x.FxRate,
                FreightInrPerKg = x.FreightInrPerKg,
                DirectRateInrPerKg = x.DirectRateInrPerKg,
                LandedCostInrPerKg = x.LandedCostInrPerKg,
                EffectiveDate = x.EffectiveDate,
                UpdatedBy = x.UpdatedBy ?? x.CreatedBy,
                Type = x.Type
            })
            .ToListAsync(cancellationToken);
    }
}
