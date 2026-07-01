using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Audit;

/// <summary>Generic before/after change log for any tracked mutation across modules
/// (Price changes, Product changes, Role changes, etc - "PART 7: Database Tracking").</summary>
public class AuditLog : BaseEntity
{
    public int? UserId { get; set; }
    public string? UserName { get; set; }

    public string Module { get; set; } = string.Empty;     // "Material", "Sku", "Quotation", "Role"...
    public string Action { get; set; } = string.Empty;      // "Create", "Update", "Delete", "PriceStamp"
    public string EntityName { get; set; } = string.Empty;
    public string? EntityId { get; set; }

    public string? OldValues { get; set; }                  // JSON snapshot
    public string? NewValues { get; set; }                  // JSON snapshot

    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
}
