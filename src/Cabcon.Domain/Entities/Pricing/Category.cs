using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Pricing;

/// <summary>Normalized form of the HTML's free-text sku.category string.
/// Auto-created on the fly from the UI to preserve identical UX (typing a new
/// category name on a product just creates the Category row transparently).</summary>
public class Category : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public ICollection<Sku> Skus { get; set; } = new List<Sku>();
}
