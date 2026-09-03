using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using MediatR;
using Microsoft.EntityFrameworkCore;

using Cabcon.Domain.Enums;

namespace Cabcon.Application.Features.Pricing.Materials;

public record GetMaterialMissingDatesQuery(int MaterialId, MaterialType? Type = null, string? VendorName = null, int? VendorId = null) : IRequest<IReadOnlyList<DateTime>>;

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
        if (material == null)
            return Array.Empty<DateTime>();

        // Calculate missing dates in the last 30 days
        var today = DateTime.UtcNow.Date;
        var end = today.AddDays(1); // include today
        var start = today.AddDays(-30);
        
        var query = _historyRepository.Query()
            .Where(h => h.MaterialId == request.MaterialId && h.EffectiveDate >= start && h.EffectiveDate < end);

        if (request.Type.HasValue)
        {
            query = query.Where(h => h.Type == request.Type.Value);
            if (request.Type.Value == MaterialType.Direct)
            {
                if (request.VendorId.HasValue)
                {
                    query = query.Where(h => h.VendorId == request.VendorId.Value);
                }
                else if (!string.IsNullOrWhiteSpace(request.VendorName))
                {
                    var vName = request.VendorName.Trim().ToLower();
                    query = query.Where(h => h.Vendor != null && h.Vendor.Name.ToLower() == vName);
                }
            }
        }

        var historyDates = await query
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
