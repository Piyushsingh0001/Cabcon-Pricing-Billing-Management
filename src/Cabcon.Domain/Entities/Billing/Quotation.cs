using Cabcon.Domain.Common;
using Cabcon.Domain.Enums;

namespace Cabcon.Domain.Entities.Billing;

/// <summary>Mirrors the HTML's "Generate quotation" output (Offer & Send tab).</summary>
public class Quotation : BaseEntity
{
    public string QuotationNumber { get; set; } = string.Empty;   // CIL/Q/yyyymmdd/nnn
    public DateTime QuotationDate { get; set; }

    public string PartyName { get; set; } = string.Empty;
    public int ValidityDays { get; set; }

    /// <summary>Frozen disclaimer text captured at generation time (e.g. "Copper as on
    /// 2026-06-30, Aluminium as on 2026-06-29") so it never silently changes later.</summary>
    public string PriceBasisNote { get; set; } = string.Empty;

    public decimal TotalExGst { get; set; }
    public decimal TotalGst { get; set; }
    public decimal TotalGross { get; set; }

    public ApprovalStatus ApprovalStatus { get; set; } = ApprovalStatus.Pending;

    public bool IsActive { get; set; } = true;
    
    public QuotationState? QuotationState { get; set; }

    public ICollection<QuotationLine> Lines { get; } = new List<QuotationLine>();
    public ICollection<QuotationTracking> QuotationTrackings { get; } = new List<QuotationTracking>();
}
