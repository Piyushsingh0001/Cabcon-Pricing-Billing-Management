using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;

namespace Cabcon.Domain.Services;

/// <summary>
/// Pure, stateless domain service. This is a 1:1 translation of the HTML's
/// calculation engine (landed / skuRM / skuMfg / effOfferEx functions) and MUST
/// produce numerically identical results - it is the single source of truth used
/// by both live pricing reads and historical quotation generation/recompute.
/// No I/O, no EF Core references - pure functions over already-loaded entities.
/// </summary>
public class PricingCalculationService
{
    /// <summary>HTML: landed(material) - ₹ per kg.</summary>
    public decimal LandedCost(Material material)
    {
        if (material.Type == MaterialType.Exchange)
        {
            var lme = material.LmeUsdPerMt ?? 0;
            var premium = material.PremiumUsdPerMt ?? 0;
            var fx = material.FxRate ?? 0;
            var freight = material.FreightInrPerMt ?? 0;
            return ((lme + premium) * fx + freight) / 1000m;
        }

        return material.DirectRateInrPerKg ?? 0;
    }

    /// <summary>HTML: skuRM(sku) - sum of BOM weight * landed cost.</summary>
    public decimal RawMaterialCost(Sku sku) =>
        sku.BomLines.Sum(b => 
        {
            if (b.PricingMethod == BomPricingMethod.Manual || b.PricingMethod == BomPricingMethod.Average)
            {
                return b.WeightKg * (b.ManualPrice ?? 0);
            }
            return b.WeightKg * LandedCost(b.Material);
        });

    /// <summary>HTML: skuWt(sku) - total BOM weight in kg.</summary>
    public decimal TotalBomWeight(Sku sku) =>
        sku.BomLines.Sum(b => b.WeightKg);

    /// <summary>
    /// HTML: skuMfg(sku, mfgOverride). When mfgOverrideValue is supplied it stands in
    /// for sku.ConversionValue exactly as the HTML's per-row "mfg" override input does.
    /// </summary>
    public decimal ManufacturingCost(Sku sku, decimal? mfgOverrideValue = null, ConversionType? convTypeOverride = null)
    {
        var rm = RawMaterialCost(sku);
        var convType = convTypeOverride ?? sku.ConversionType;
        var conv = mfgOverrideValue ?? (sku.ConversionType == ConversionType.Percentage && convType == ConversionType.Percentage ? sku.ConversionValue : (convType == ConversionType.Percentage ? sku.ConversionValue / 100m : sku.ConversionValue));

        if (convType == ConversionType.Percentage)
        {
            if (conv > 1m) conv = 1m;
            return rm * (1 + conv);
        }
        else
        {
            return rm + TotalBomWeight(sku) * conv;
        }
    }

    /// <summary>
    /// HTML: effOfferEx(sku) under the three loading modes, with per-row overrides
    /// taking precedence exactly as in the "Offer & Send" tab.
    /// </summary>
    public decimal EffectiveOfferExGst(
        Sku sku,
        LoadingMode mode,
        decimal globalPct,
        decimal globalAmt,
        decimal globalOverheadPct,
        decimal globalMarginPct,
        decimal globalPacking,
        decimal globalFreight,
        decimal? rowMfgOverride = null,
        decimal? rowPctOverride = null,
        decimal? rowAmtOverride = null,
        decimal? rowOfferOverride = null,
        ConversionType? convTypeOverride = null)
    {
        if (rowOfferOverride.HasValue) return rowOfferOverride.Value;

        var rm = RawMaterialCost(sku);
        var mfg = ManufacturingCost(sku, rowMfgOverride, convTypeOverride);

        return mode switch
        {
            LoadingMode.SimplePercentage => mfg + (rm * (rowPctOverride ?? globalPct)),
            LoadingMode.SimpleAmount => mfg + (rowAmtOverride ?? globalAmt),
            LoadingMode.Itemised => mfg + (rm * (globalOverheadPct + globalMarginPct)) + globalPacking + globalFreight,
            _ => mfg
        };
    }

    /// <summary>GST amount and gross (incl-GST) rate for a computed ex-GST offer.</summary>
    public (decimal GstAmount, decimal Gross) ApplyGst(decimal offerExGst, decimal gstRate)
    {
        var gst = offerExGst * gstRate;
        return (gst, offerExGst + gst);
    }
}
