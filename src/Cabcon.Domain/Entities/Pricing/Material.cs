using Cabcon.Domain.Common;
using Cabcon.Domain.Enums;

namespace Cabcon.Domain.Entities.Pricing;

/// <summary>
/// Mirrors HTML "materials": Copper/Aluminium (Exchange-linked) or PVC-FR/Steel/XLPE (Direct).
/// Current price fields live on the row itself (matches the HTML's mutable-in-place model);
/// every "stamp" additionally appends a <see cref="MaterialPriceHistory"/> row for audit trail.
/// </summary>
public class Material : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int? VendorId { get; set; }
    public Vendor? Vendor { get; set; }
    public MaterialType Type { get; set; }

    // Exchange-linked fields (used when Type == Exchange)
    public decimal? LmeUsdPerMt { get; set; }
    public decimal? PremiumUsdPerMt { get; set; }
    public decimal? FxRate { get; set; }
    public decimal? FreightInrPerMt { get; set; }

    // Direct fields (used when Type == Direct)
    public decimal? DirectRateInrPerKg { get; set; }

    public DateTime AsOnDate { get; set; }

    /// <summary>True = example/seed data, "needs a real price today" (mirrors HTML's placeholder tag).</summary>
    public bool IsPlaceholder { get; set; }

    public ICollection<MaterialPriceHistory> PriceHistory { get; set; } = new List<MaterialPriceHistory>();
    public ICollection<SkuBomLine> BomLines { get; set; } = new List<SkuBomLine>();
}
