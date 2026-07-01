using Cabcon.Domain.Common;
using Cabcon.Domain.Enums;

namespace Cabcon.Domain.Entities.Pricing;

/// <summary>Immutable snapshot written every time a material price is "stamped" in the UI.
/// Enables historical recompute of any past quotation's underlying RM cost.</summary>
public class MaterialPriceHistory : BaseEntity
{
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;

    public MaterialType Type { get; set; }
    public decimal? LmeUsdPerMt { get; set; }
    public decimal? PremiumUsdPerMt { get; set; }
    public decimal? FxRate { get; set; }
    public decimal? FreightInrPerMt { get; set; }
    public decimal? DirectRateInrPerKg { get; set; }

    public decimal LandedCostInrPerKg { get; set; }   // computed & frozen at stamp time
    public DateTime EffectiveDate { get; set; }
}
