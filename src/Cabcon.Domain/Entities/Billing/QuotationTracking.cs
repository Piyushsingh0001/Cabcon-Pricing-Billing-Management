using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Billing;

public class QuotationTracking : BaseEntity
{
    public int QuotationId { get; set; }
    public string QuotationNumber { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    
    // Navigation property
    public Quotation Quotation { get; set; } = null!;
}
