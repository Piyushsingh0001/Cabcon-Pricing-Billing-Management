using Cabcon.Domain.Common;
using Cabcon.Domain.Entities.Pricing;

namespace Cabcon.Domain.Entities.Billing;

/// <summary>
/// One product line on a generated quotation. Values are FROZEN at generation time
/// (RM/material prices move daily - a quotation must stay historically accurate even
/// after Materials are repriced), so this does not get recomputed live.
/// </summary>
public class QuotationLine : BaseEntity
{
    public int QuotationId { get; set; }
    public Quotation Quotation { get; set; } = null!;

    public int SkuId { get; set; }
    public Sku Sku { get; set; } = null!;

    public string DescriptionSnapshot { get; set; } = string.Empty;  // "Category - Name Spec"
    public string Unit { get; set; } = string.Empty;

    public decimal RmCostSnapshot { get; set; }
    public decimal MfgCostSnapshot { get; set; }
    public decimal OfferExGst { get; set; }
    public decimal Profit { get; set; }
    public decimal GstPercent { get; set; }
    public decimal GstAmount { get; set; }
    public decimal GrossRate { get; set; }

    public int LineOrder { get; set; }
}
