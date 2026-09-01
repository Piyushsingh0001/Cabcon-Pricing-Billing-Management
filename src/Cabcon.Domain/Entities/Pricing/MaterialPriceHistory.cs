using Cabcon.Domain.Common;
using Cabcon.Domain.Enums;

namespace Cabcon.Domain.Entities.Pricing;

/// <summary>
/// Immutable snapshot written every time a material price is "stamped" in the UI.
/// Supports both LME/Exchange-linked and Direct pricing methods.
/// </summary>
public class MaterialPriceHistory : BaseEntity
{
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;

    public MaterialType Type { get; set; }
    public DateTime EffectiveDate { get; set; }

    /// <summary>Nullable Vendor ID for Direct type pricing; null for LME/Exchange type.</summary>
    public int? VendorId { get; set; }
    public Vendor? Vendor { get; set; }

    // Direct pricing fields
    public decimal? DirectRateInrPerKg { get; set; }

    // LME/Exchange-linked fields
    public decimal? LmeUsdPerMt { get; set; }
    public decimal? PremiumUsdPerMt { get; set; }
    public decimal? FxRate { get; set; }
    public decimal? FreightInrPerKg { get; set; }

    // Computed & frozen landed cost at stamp time (₹/kg)
    public decimal LandedCostInrPerKg { get; set; }
}
