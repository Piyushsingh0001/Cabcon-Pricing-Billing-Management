using Cabcon.Application.Common.Interfaces;
using Cabcon.Application.Common.Models;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Cabcon.Domain.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Materials;

public record MaterialDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public MaterialType Type { get; init; }
    public decimal? LmeUsdPerMt { get; init; }
    public decimal? PremiumUsdPerMt { get; init; }
    public decimal? FxRate { get; init; }
    public decimal? FreightInrPerKg { get; init; }
    public decimal? DirectRateInrPerKg { get; init; }
    public DateTime AsOnDate { get; init; }
    public bool IsPlaceholder { get; init; }
    public decimal LandedCost { get; init; }
    public string? UpdatedBy { get; init; }
    public string? VendorName { get; init; }
    public int? VendorId { get; init; }
    public int MissingDaysCountLme { get; init; }
    public int MissingDaysCountDirect { get; init; }
    public decimal ThisMonthAvgLme { get; init; }
    public decimal PrevMonthAvgLme { get; init; }
    public decimal ThisMonthAvgDirect { get; init; }
    public decimal PrevMonthAvgDirect { get; init; }
    /// <summary>True when a history record for today already exists for LME/Exchange type.</summary>
    public bool IsTodayUpdatedLme { get; init; }
    /// <summary>True when a history record for today already exists for Direct type.</summary>
    public bool IsTodayUpdatedDirect { get; init; }
}

public record GetMaterialsQuery : IRequest<PaginatedList<MaterialDto>>
{
    public string? Search { get; init; }
    public MaterialType? Type { get; init; }
    public string? SortBy { get; init; }
    public bool SortDesc { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 100;
}

public class GetMaterialsQueryHandler : IRequestHandler<GetMaterialsQuery, PaginatedList<MaterialDto>>
{
    private readonly IRepository<Material> _repository;
    private readonly IRepository<MaterialPriceHistory> _historyRepo;
    private readonly PricingCalculationService _pricingService = new();

    public GetMaterialsQueryHandler(IRepository<Material> repository, IRepository<MaterialPriceHistory> historyRepo)
    {
        _repository = repository;
        _historyRepo = historyRepo;
    }

    public async Task<PaginatedList<MaterialDto>> Handle(GetMaterialsQuery request, CancellationToken cancellationToken)
    {
        var query = _repository.Query();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(m => m.Name.ToLower().Contains(search));
        }

        // Apply sorting
        if (!string.IsNullOrWhiteSpace(request.SortBy))
        {
            query = request.SortBy.ToLower() switch
            {
                "name" => request.SortDesc ? query.OrderByDescending(m => m.Name) : query.OrderBy(m => m.Name),
                _ => request.SortDesc ? query.OrderByDescending(m => m.Id) : query.OrderBy(m => m.Id)
            };
        }
        else
        {
            query = query.OrderBy(m => m.Name);
        }

        var count = await query.CountAsync(cancellationToken);
        var items = await query
            .Include(m => m.MaterialVendors)
                .ThenInclude(mv => mv.Vendor)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var materialIds = items.Select(x => x.Id).ToList();
        var today = DateTime.UtcNow.Date;
        var localToday = DateTime.Today;
        var thirtyDaysAgo = today.AddDays(-30);
        var startOfThisMonth = new DateTime(today.Year, today.Month, 1);
        var startOfPrevMonth = startOfThisMonth.AddMonths(-1);
        
        var earliestDate = new[] { thirtyDaysAgo, startOfPrevMonth }.Min();
        
        var histories = await _historyRepo.Query()
            .Include(h => h.Vendor)
            .Where(h => materialIds.Contains(h.MaterialId) && h.EffectiveDate >= earliestDate)
            .Select(h => new
            {
                h.MaterialId,
                h.EffectiveDate,
                h.LandedCostInrPerKg,
                h.Type,
                h.VendorId,
                VendorName = h.Vendor != null ? h.Vendor.Name : null,
                h.DirectRateInrPerKg,
                h.LmeUsdPerMt,
                h.PremiumUsdPerMt,
                h.FxRate,
                h.FreightInrPerKg,
                h.UpdatedBy,
                h.CreatedBy
            })
            .ToListAsync(cancellationToken);

        var dtos = new List<MaterialDto>();

        foreach (var m in items)
        {
            var mHistories = histories.Where(h => h.MaterialId == m.Id).ToList();
            var mHistoriesLme = mHistories.Where(h => h.Type == MaterialType.Exchange).ToList();
            var mHistoriesDirect = mHistories.Where(h => h.Type == MaterialType.Direct).ToList();

            var mHistoryDatesLme = mHistoriesLme.Where(h => h.EffectiveDate.Date >= thirtyDaysAgo).Select(h => h.EffectiveDate.Date).Distinct().ToList();

            var latestLme = mHistoriesLme.OrderByDescending(h => h.EffectiveDate).FirstOrDefault();

            // Calculate LME missing days in the last 30 days (or since creation)
            var startDate = m.CreatedDate.Date > thirtyDaysAgo ? m.CreatedDate.Date : thirtyDaysAgo;
            int missingCountLme = 0;
            for (var d = startDate; d <= today; d = d.AddDays(1))
            {
                bool hasLme = mHistoryDatesLme.Contains(d);
                if (!hasLme) missingCountLme++;
            }

            var thisMonthAvgLme = mHistoriesLme.Where(h => h.EffectiveDate.Date >= startOfThisMonth && h.EffectiveDate.Date <= today).Average(h => (decimal?)h.LandedCostInrPerKg) ?? 0m;
            var prevMonthAvgLme = mHistoriesLme.Where(h => h.EffectiveDate.Date >= startOfPrevMonth && h.EffectiveDate.Date < startOfThisMonth).Average(h => (decimal?)h.LandedCostInrPerKg) ?? 0m;

            bool isTodayUpdatedLme = mHistoryDatesLme.Contains(today) || mHistoryDatesLme.Contains(localToday);

            var mappedVendors = m.MaterialVendors
                .Where(mv => !mv.IsDeleted && mv.Vendor != null && !mv.Vendor.IsDeleted)
                .Select(mv => mv.Vendor)
                .ToList();

            var allVendorEntries = mappedVendors.Select(v => new { Id = (int?)v.Id, Name = v.Name }).ToList();

            if (allVendorEntries.Count == 0)
            {
                // Single base DTO for material
                var latestDirect = mHistoriesDirect.OrderByDescending(h => h.EffectiveDate).FirstOrDefault();
                var mHistoryDatesDirect = mHistoriesDirect.Where(h => h.EffectiveDate.Date >= thirtyDaysAgo).Select(h => h.EffectiveDate.Date).Distinct().ToList();

                int missingCountDirect = 0;
                for (var d = startDate; d <= today; d = d.AddDays(1))
                {
                    if (!mHistoryDatesDirect.Contains(d)) missingCountDirect++;
                }

                var thisMonthAvgDirect = mHistoriesDirect.Where(h => h.EffectiveDate.Date >= startOfThisMonth && h.EffectiveDate.Date <= today).Average(h => (decimal?)h.LandedCostInrPerKg) ?? 0m;
                var prevMonthAvgDirect = mHistoriesDirect.Where(h => h.EffectiveDate.Date >= startOfPrevMonth && h.EffectiveDate.Date < startOfThisMonth).Average(h => (decimal?)h.LandedCostInrPerKg) ?? 0m;
                bool isTodayUpdatedDirect = mHistoryDatesDirect.Contains(today) || mHistoryDatesDirect.Contains(localToday);

                dtos.Add(new MaterialDto
                {
                    Id = m.Id,
                    Name = m.Name,
                    Type = latestLme != null ? MaterialType.Exchange : MaterialType.Direct,
                    LmeUsdPerMt = latestLme?.LmeUsdPerMt,
                    PremiumUsdPerMt = latestLme?.PremiumUsdPerMt,
                    FxRate = latestLme?.FxRate,
                    FreightInrPerKg = latestLme?.FreightInrPerKg,
                    DirectRateInrPerKg = latestDirect?.DirectRateInrPerKg,
                    AsOnDate = latestLme?.EffectiveDate ?? latestDirect?.EffectiveDate ?? m.CreatedDate,
                    IsPlaceholder = latestLme == null && latestDirect == null,
                    LandedCost = latestLme?.LandedCostInrPerKg ?? latestDirect?.LandedCostInrPerKg ?? 0m,
                    UpdatedBy = latestLme?.UpdatedBy ?? latestDirect?.UpdatedBy ?? m.UpdatedBy ?? m.CreatedBy,
                    VendorName = null,
                    VendorId = null,
                    MissingDaysCountLme = missingCountLme,
                    MissingDaysCountDirect = missingCountDirect,
                    ThisMonthAvgLme = thisMonthAvgLme,
                    PrevMonthAvgLme = prevMonthAvgLme,
                    ThisMonthAvgDirect = thisMonthAvgDirect,
                    PrevMonthAvgDirect = prevMonthAvgDirect,
                    IsTodayUpdatedLme = isTodayUpdatedLme,
                    IsTodayUpdatedDirect = isTodayUpdatedDirect
                });
            }
            else
            {
                // DTO for each vendor mapping
                foreach (var v in allVendorEntries)
                {
                    var vHistories = mHistoriesDirect
                        .Where(h => (v.Id.HasValue && h.VendorId == v.Id.Value) || (h.VendorName != null && h.VendorName.Equals(v.Name, StringComparison.OrdinalIgnoreCase)))
                        .ToList();

                    var vHistoryDates = vHistories.Where(h => h.EffectiveDate.Date >= thirtyDaysAgo).Select(h => h.EffectiveDate.Date).Distinct().ToList();
                    var vLatestDirect = vHistories.OrderByDescending(h => h.EffectiveDate).FirstOrDefault();

                    int vMissingCountDirect = 0;
                    for (var d = startDate; d <= today; d = d.AddDays(1))
                    {
                        if (!vHistoryDates.Contains(d)) vMissingCountDirect++;
                    }

                    var thisMonthAvgDirect = vHistories.Where(h => h.EffectiveDate.Date >= startOfThisMonth && h.EffectiveDate.Date <= today).Average(h => (decimal?)h.LandedCostInrPerKg) ?? 0m;
                    var prevMonthAvgDirect = vHistories.Where(h => h.EffectiveDate.Date >= startOfPrevMonth && h.EffectiveDate.Date < startOfThisMonth).Average(h => (decimal?)h.LandedCostInrPerKg) ?? 0m;
                    bool isTodayUpdatedDirect = vHistoryDates.Contains(today) || vHistoryDates.Contains(localToday);

                    dtos.Add(new MaterialDto
                    {
                        Id = m.Id,
                        Name = m.Name,
                        Type = MaterialType.Direct,
                        LmeUsdPerMt = latestLme?.LmeUsdPerMt,
                        PremiumUsdPerMt = latestLme?.PremiumUsdPerMt,
                        FxRate = latestLme?.FxRate,
                        FreightInrPerKg = latestLme?.FreightInrPerKg,
                        DirectRateInrPerKg = vLatestDirect?.DirectRateInrPerKg,
                        AsOnDate = vLatestDirect?.EffectiveDate ?? latestLme?.EffectiveDate ?? m.CreatedDate,
                        IsPlaceholder = vLatestDirect == null,
                        LandedCost = vLatestDirect?.LandedCostInrPerKg ?? latestLme?.LandedCostInrPerKg ?? 0m,
                        UpdatedBy = vLatestDirect?.UpdatedBy ?? latestLme?.UpdatedBy ?? m.UpdatedBy ?? m.CreatedBy,
                        VendorName = v.Name,
                        VendorId = v.Id,
                        MissingDaysCountLme = missingCountLme,
                        MissingDaysCountDirect = vMissingCountDirect,
                        ThisMonthAvgLme = thisMonthAvgLme,
                        PrevMonthAvgLme = prevMonthAvgLme,
                        ThisMonthAvgDirect = thisMonthAvgDirect,
                        PrevMonthAvgDirect = prevMonthAvgDirect,
                        IsTodayUpdatedLme = isTodayUpdatedLme,
                        IsTodayUpdatedDirect = isTodayUpdatedDirect
                    });
                }
            }
        }

        return new PaginatedList<MaterialDto>(dtos, count, request.PageNumber, request.PageSize);
    }
}
