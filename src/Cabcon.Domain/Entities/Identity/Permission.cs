using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Identity;

public class Permission : BaseEntity
{
    /// <summary>e.g. "Pricing.Update", "Sku.Delete", "Quotation.Generate"</summary>
    public string Code { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;        // e.g. "Pricing", "Sku", "Quotation"
    public string? Description { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
