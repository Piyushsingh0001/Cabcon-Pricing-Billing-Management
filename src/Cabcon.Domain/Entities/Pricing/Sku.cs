using Cabcon.Domain.Common;
using Cabcon.Domain.Entities.Billing;
using Cabcon.Domain.Enums;

namespace Cabcon.Domain.Entities.Pricing;

/// <summary>Mirrors a HTML "product" row (e.g. Housing Wire FR 1.5 sq.mm, LT Cable XLPE Al 3.5C x 95).</summary>
public class Sku : BaseEntity
{
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public string Name { get; set; } = string.Empty;      // variant, e.g. "FR"
    public string Spec { get; set; } = string.Empty;       // e.g. "1.5 sq.mm"
    public string Unit { get; set; } = string.Empty;        // coil / 100m / km / MT

    public ConversionType ConversionType { get; set; }
    /// <summary>Fraction (0.08 = 8%) when ConversionType == Percentage, else ₹/kg.</summary>
    public decimal ConversionValue { get; set; }

    /// <summary>Fraction (0.18 = 18%) GST rate.</summary>
    public decimal GstRate { get; set; }

    public decimal Quantity { get; set; } = 1m;

    public bool IsPlaceholder { get; set; }

    public ICollection<SkuBomLine> BomLines { get; set; } = new List<SkuBomLine>();
    public ICollection<QuotationLine> QuotationLines { get; set; } = new List<QuotationLine>();
}
