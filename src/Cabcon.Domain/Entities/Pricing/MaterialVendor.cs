using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Pricing;

public class MaterialVendor : BaseEntity
{
    public string MaterialName { get; set; } = string.Empty;
    public int VendorId { get; set; }
    public Vendor Vendor { get; set; } = null!;
}
