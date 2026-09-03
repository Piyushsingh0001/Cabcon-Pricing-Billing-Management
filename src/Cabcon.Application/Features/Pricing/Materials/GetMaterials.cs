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
    public decimal? FreightInrPerMt => FreightInrPerKg.HasValue ? FreightInrPerKg.Value * 1000m : null;
    public decimal? DirectRateInrPerKg { get; init; }
    public DateTime AsOnDate { get; init; }
    public DateTime? AsOnDateLme { get; init; }
    public DateTime? AsOnDateDirect { get; init; }
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

            // Material-wide Direct price metrics (independent of vendor)
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

            var todayLme = mHistoriesLme.Where(h => h.EffectiveDate.Date == today || h.EffectiveDate.Date == localToday).OrderByDescending(h => h.EffectiveDate).FirstOrDefault();
            var todayDirect = mHistoriesDirect.Where(h => h.EffectiveDate.Date == today || h.EffectiveDate.Date == localToday).OrderByDescending(h => h.EffectiveDate).FirstOrDefault();

            if (allVendorEntries.Count == 0)
            {
                // Single base DTO for material
                dtos.Add(new MaterialDto
                {
                    Id = m.Id,
                    Name = m.Name,
                    Type = latestLme != null ? MaterialType.Exchange : MaterialType.Direct,
                    LmeUsdPerMt = isTodayUpdatedLme ? todayLme?.LmeUsdPerMt : null,
                    PremiumUsdPerMt = isTodayUpdatedLme ? todayLme?.PremiumUsdPerMt : null,
                    FxRate = isTodayUpdatedLme ? todayLme?.FxRate : null,
                    FreightInrPerKg = isTodayUpdatedLme ? todayLme?.FreightInrPerKg : null,
                    DirectRateInrPerKg = isTodayUpdatedDirect ? todayDirect?.DirectRateInrPerKg : null,
                    AsOnDate = todayLme?.EffectiveDate ?? todayDirect?.EffectiveDate ?? latestLme?.EffectiveDate ?? latestDirect?.EffectiveDate ?? m.CreatedDate,
                    AsOnDateLme = todayLme?.EffectiveDate ?? latestLme?.EffectiveDate,
                    AsOnDateDirect = todayDirect?.EffectiveDate ?? latestDirect?.EffectiveDate,
                    IsPlaceholder = latestLme == null && latestDirect == null,
                    LandedCost = isTodayUpdatedLme ? (todayLme?.LandedCostInrPerKg ?? 0m) : (isTodayUpdatedDirect ? (todayDirect?.LandedCostInrPerKg ?? 0m) : 0m),
                    UpdatedBy = todayLme?.UpdatedBy ?? todayDirect?.UpdatedBy ?? latestLme?.UpdatedBy ?? latestDirect?.UpdatedBy ?? m.UpdatedBy ?? m.CreatedBy,
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
                // DTO for each vendor mapping with vendor-specific metrics
                foreach (var v in allVendorEntries)
                {
                    var vHistories = mHistoriesDirect
                        .Where(h => (v.Id.HasValue && h.VendorId == v.Id.Value) || (h.VendorName != null && h.VendorName.Equals(v.Name, StringComparison.OrdinalIgnoreCase)))
                        .ToList();

                    var vHistoryDatesDirect = vHistories.Where(h => h.EffectiveDate.Date >= thirtyDaysAgo).Select(h => h.EffectiveDate.Date).Distinct().ToList();

                    int vMissingCountDirect = 0;
                    for (var d = startDate; d <= today; d = d.AddDays(1))
                    {
                        if (!vHistoryDatesDirect.Contains(d)) vMissingCountDirect++;
                    }

                    var vThisMonthAvgDirect = vHistories.Where(h => h.EffectiveDate.Date >= startOfThisMonth && h.EffectiveDate.Date <= today).Average(h => (decimal?)h.LandedCostInrPerKg) ?? 0m;
                    var vPrevMonthAvgDirect = vHistories.Where(h => h.EffectiveDate.Date >= startOfPrevMonth && h.EffectiveDate.Date < startOfThisMonth).Average(h => (decimal?)h.LandedCostInrPerKg) ?? 0m;
                    bool vIsTodayUpdatedDirect = vHistoryDatesDirect.Contains(today) || vHistoryDatesDirect.Contains(localToday);

                    var vTodayDirect = vHistories.Where(h => h.EffectiveDate.Date == today || h.EffectiveDate.Date == localToday).OrderByDescending(h => h.EffectiveDate).FirstOrDefault();
                    var vLatestDirect = vHistories.OrderByDescending(h => h.EffectiveDate).FirstOrDefault();

                    dtos.Add(new MaterialDto
                    {
                        Id = m.Id,
                        Name = m.Name,
                        Type = MaterialType.Direct,
                        LmeUsdPerMt = isTodayUpdatedLme ? todayLme?.LmeUsdPerMt : null,
                        PremiumUsdPerMt = isTodayUpdatedLme ? todayLme?.PremiumUsdPerMt : null,
                        FxRate = isTodayUpdatedLme ? todayLme?.FxRate : null,
                        FreightInrPerKg = isTodayUpdatedLme ? todayLme?.FreightInrPerKg : null,
                        DirectRateInrPerKg = vIsTodayUpdatedDirect ? vTodayDirect?.DirectRateInrPerKg : null,
                        AsOnDate = vTodayDirect?.EffectiveDate ?? todayLme?.EffectiveDate ?? vLatestDirect?.EffectiveDate ?? latestLme?.EffectiveDate ?? m.CreatedDate,
                        AsOnDateLme = todayLme?.EffectiveDate ?? latestLme?.EffectiveDate,
                        AsOnDateDirect = vTodayDirect?.EffectiveDate ?? vLatestDirect?.EffectiveDate ?? latestDirect?.EffectiveDate,
                        IsPlaceholder = vLatestDirect == null,
                        LandedCost = vIsTodayUpdatedDirect ? (vTodayDirect?.LandedCostInrPerKg ?? 0m) : 0m,
                        UpdatedBy = vTodayDirect?.UpdatedBy ?? todayLme?.UpdatedBy ?? vLatestDirect?.UpdatedBy ?? latestLme?.UpdatedBy ?? m.UpdatedBy ?? m.CreatedBy,
                        VendorName = v.Name,
                        VendorId = v.Id,
                        MissingDaysCountLme = missingCountLme,
                        MissingDaysCountDirect = vMissingCountDirect,
                        ThisMonthAvgLme = thisMonthAvgLme,
                        PrevMonthAvgLme = prevMonthAvgLme,
                        ThisMonthAvgDirect = vThisMonthAvgDirect,
                        PrevMonthAvgDirect = vPrevMonthAvgDirect,
                        IsTodayUpdatedLme = isTodayUpdatedLme,
                        IsTodayUpdatedDirect = vIsTodayUpdatedDirect
                    });
                }
            }
        }

        return new PaginatedList<MaterialDto>(dtos, count, request.PageNumber, request.PageSize);
    }
}
