using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Materials.Queries.GetMonthlyAveragePrices;

public record MonthlyAveragePriceDto(int MaterialId, string MaterialName, string? VendorName, decimal AverageLandedCost);

public record GetMonthlyAveragePricesQuery(int Month, int Year) : IRequest<List<MonthlyAveragePriceDto>>;

public class GetMonthlyAveragePricesQueryHandler : IRequestHandler<GetMonthlyAveragePricesQuery, List<MonthlyAveragePriceDto>>
{
    private readonly IApplicationDbContext _db;

    public GetMonthlyAveragePricesQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<MonthlyAveragePriceDto>> Handle(GetMonthlyAveragePricesQuery request, CancellationToken cancellationToken)
    {
        // Get all price history for the given month and year
        var histories = await _db.MaterialPriceHistory
            .Include(x => x.Material)
            .ThenInclude(m => m.Vendor)
            .Where(x => x.EffectiveDate.Month == request.Month && x.EffectiveDate.Year == request.Year)
            .ToListAsync(cancellationToken);

        // Group by material and calculate average landed cost
        var averages = histories
            .GroupBy(x => new { x.MaterialId, x.Material.Name, VendorName = x.VendorName ?? x.Material.Vendor?.Name })
            .Select(g => new MonthlyAveragePriceDto(
                g.Key.MaterialId,
                g.Key.Name,
                g.Key.VendorName,
                g.Average(x => x.LandedCostInrPerKg)
            ))
            .OrderBy(x => x.MaterialName)
            .ToList();

        return averages;
    }
}
