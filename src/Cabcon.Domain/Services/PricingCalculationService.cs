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
        sku.BomLines.Sum(b => b.WeightKg * LandedCost(b.Material));

    /// <summary>HTML: skuWt(sku) - total BOM weight in kg.</summary>
    public decimal TotalBomWeight(Sku sku) =>
        sku.BomLines.Sum(b => b.WeightKg);

    /// <summary>
    /// HTML: skuMfg(sku, mfgOverride). When mfgOverrideValue is supplied it stands in
    /// for sku.ConversionValue exactly as the HTML's per-row "mfg" override input does.
    /// </summary>
    public decimal ManufacturingCost(Sku sku, decimal? mfgOverrideValue = null)
    {
        var rm = RawMaterialCost(sku);
        var conv = mfgOverrideValue ?? sku.ConversionValue;

        return sku.ConversionType == ConversionType.Percentage
            ? rm * (1 + conv)
            : rm + TotalBomWeight(sku) * conv;
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
        decimal? rowOfferOverride = null)
    {
        if (rowOfferOverride.HasValue) return rowOfferOverride.Value;

        var mfg = ManufacturingCost(sku, rowMfgOverride);

        return mode switch
        {
            LoadingMode.SimplePercentage => mfg * (1 + (rowPctOverride ?? globalPct)),
            LoadingMode.SimpleAmount => mfg + (rowAmtOverride ?? globalAmt),
            LoadingMode.Itemised => mfg * (1 + globalOverheadPct + globalMarginPct) + globalPacking + globalFreight,
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
