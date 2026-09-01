using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Pricing;

public class Vendor : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public ICollection<MaterialVendor> MaterialVendors { get; set; } = new List<MaterialVendor>();
    public ICollection<MaterialPriceHistory> PriceHistories { get; set; } = new List<MaterialPriceHistory>();
}
