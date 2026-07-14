using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Materials;

public record GetMaterialMissingDatesQuery(int MaterialId) : IRequest<IReadOnlyList<DateTime>>;

public class GetMaterialMissingDatesQueryHandler : IRequestHandler<GetMaterialMissingDatesQuery, IReadOnlyList<DateTime>>
{
    private readonly IRepository<Material> _materialRepository;
    private readonly IRepository<MaterialPriceHistory> _historyRepository;

    public GetMaterialMissingDatesQueryHandler(
        IRepository<Material> materialRepository,
        IRepository<MaterialPriceHistory> historyRepository)
    {
        _materialRepository = materialRepository;
        _historyRepository = historyRepository;
    }

    public async Task<IReadOnlyList<DateTime>> Handle(GetMaterialMissingDatesQuery request, CancellationToken cancellationToken)
    {
        var material = await _materialRepository.GetByIdAsync(request.MaterialId, cancellationToken);
        if (material == null || material.IsPlaceholder)
            return Array.Empty<DateTime>();

        // Calculate missing dates in the last 30 days
        var end = DateTime.UtcNow.Date;
        var start = end.AddDays(-30);
        
        var historyDates = await _historyRepository.Query()
            .Where(h => h.MaterialId == request.MaterialId && h.EffectiveDate >= start && h.EffectiveDate < end)
            .Select(h => h.EffectiveDate.Date)
            .Distinct()
            .ToListAsync(cancellationToken);

        var missingDates = new List<DateTime>();
        for (var date = start; date < end; date = date.AddDays(1))
        {
            if (!historyDates.Contains(date))
            {
                missingDates.Add(date);
            }
        }

        return missingDates;
    }
}
