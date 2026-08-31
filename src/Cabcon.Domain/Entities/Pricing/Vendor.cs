using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Pricing;

public class Vendor : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public ICollection<Material> Materials { get; set; } = new List<Material>();
    public ICollection<MaterialVendor> MaterialVendors { get; set; } = new List<MaterialVendor>();
}
