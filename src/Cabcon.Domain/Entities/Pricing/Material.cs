using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Pricing;

/// <summary>
/// Core master entity for Raw Materials (e.g. Copper, Aluminium, PVC-FR, GI Steel Wire, XLPE).
/// Price history and vendor mappings are tracked in separate dedicated tables:
/// <see cref="MaterialPriceHistory"/> and <see cref="MaterialVendor"/>.
/// </summary>
public class Material : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public ICollection<MaterialPriceHistory> PriceHistory { get; set; } = new List<MaterialPriceHistory>();
    public ICollection<MaterialVendor> MaterialVendors { get; set; } = new List<MaterialVendor>();
    public ICollection<SkuBomLine> BomLines { get; set; } = new List<SkuBomLine>();
}
