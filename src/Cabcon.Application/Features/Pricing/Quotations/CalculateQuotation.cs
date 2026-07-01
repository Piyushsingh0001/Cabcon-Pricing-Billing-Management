using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Cabcon.Domain.Services;
using Cabcon.Shared.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Quotations;

public record QuotationItemInput
{
    public int SkuId { get; init; }
    public decimal? RowMfgOverride { get; init; }
    public decimal? RowPctOverride { get; init; }
    public decimal? RowAmtOverride { get; init; }
    public decimal? RowOfferOverride { get; init; }
}

public record CalculateQuotationCommand : IRequest<IReadOnlyList<CalculatedQuotationItemDto>>
{
    public LoadingMode Mode { get; init; }
    public decimal GlobalPct { get; init; }
    public decimal GlobalAmt { get; init; }
    public decimal GlobalOverheadPct { get; init; }
    public decimal GlobalMarginPct { get; init; }
    public decimal GlobalPacking { get; init; }
    public decimal GlobalFreight { get; init; }
    public List<QuotationItemInput> Items { get; init; } = new();
}

public record CalculatedQuotationItemDto
{
    public int SkuId { get; init; }
    public string CategoryName { get; init; } = string.Empty;
    public string SkuName { get; init; } = string.Empty;
    public string Spec { get; init; } = string.Empty;
    public string Unit { get; init; } = string.Empty;
    
    public decimal RmCost { get; init; }
    public decimal MfgCost { get; init; }
    public decimal OfferExGst { get; init; }
    public decimal GstPercent { get; init; }
    public decimal GstAmount { get; init; }
    public decimal GrossRate { get; init; }
}

public class CalculateQuotationCommandHandler : IRequestHandler<CalculateQuotationCommand, IReadOnlyList<CalculatedQuotationItemDto>>
{
    private readonly IRepository<Sku> _skuRepository;
    private readonly PricingCalculationService _pricingService = new();

    public CalculateQuotationCommandHandler(IRepository<Sku> skuRepository)
    {
        _skuRepository = skuRepository;
    }

    public async Task<IReadOnlyList<CalculatedQuotationItemDto>> Handle(CalculateQuotationCommand request, CancellationToken cancellationToken)
    {
        var skuIds = request.Items.Select(i => i.SkuId).Distinct().ToList();
        var skus = await _skuRepository.Query()
            .Include(s => s.Category)
            .Include(s => s.BomLines)
                .ThenInclude(b => b.Material)
            .Where(s => skuIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, cancellationToken);

        var results = new List<CalculatedQuotationItemDto>();

        foreach (var itemInput in request.Items)
        {
            if (!skus.TryGetValue(itemInput.SkuId, out var sku))
            {
                throw new NotFoundException(nameof(Sku), itemInput.SkuId);
            }

            var rm = _pricingService.RawMaterialCost(sku);
            var mfg = _pricingService.ManufacturingCost(sku, itemInput.RowMfgOverride);

            var offerExGst = _pricingService.EffectiveOfferExGst(
                sku,
                request.Mode,
                request.GlobalPct,
                request.GlobalAmt,
                request.GlobalOverheadPct,
                request.GlobalMarginPct,
                request.GlobalPacking,
                request.GlobalFreight,
                itemInput.RowMfgOverride,
                itemInput.RowPctOverride,
                itemInput.RowAmtOverride,
                itemInput.RowOfferOverride
            );

            var (gstAmount, gross) = _pricingService.ApplyGst(offerExGst, sku.GstRate);

            results.Add(new CalculatedQuotationItemDto
            {
                SkuId = sku.Id,
                CategoryName = sku.Category.Name,
                SkuName = sku.Name,
                Spec = sku.Spec,
                Unit = sku.Unit,
                RmCost = rm,
                MfgCost = mfg,
                OfferExGst = offerExGst,
                GstPercent = sku.GstRate,
                GstAmount = gstAmount,
                GrossRate = gross
            });
        }

        return results;
    }
}
