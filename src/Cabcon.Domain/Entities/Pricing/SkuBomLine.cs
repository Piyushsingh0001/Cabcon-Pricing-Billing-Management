using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Pricing;

/// <summary>
/// The Sku &lt;-&gt; Material many-to-many associative entity, carrying the extra
/// attribute (Weight in kg per unit) that makes it a true associative entity rather
/// than a pure join table. Mirrors a single row of the HTML's sku.bom array.
/// </summary>
public class SkuBomLine : BaseEntity
{
    public int SkuId { get; set; }
    public Sku Sku { get; set; } = null!;

    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;

    /// <summary>kg of this material per one unit of the SKU.</summary>
    public decimal WeightKg { get; set; }

    public int LineOrder { get; set; }
}
