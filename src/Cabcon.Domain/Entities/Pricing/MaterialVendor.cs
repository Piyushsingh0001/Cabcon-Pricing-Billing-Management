using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Pricing;

/// <summary>
/// Associative entity mapping a Material to an approved Vendor.
/// </summary>
public class MaterialVendor : BaseEntity
{
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;

    public int VendorId { get; set; }
    public Vendor Vendor { get; set; } = null!;
}
