using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Pricing;

/// <summary>
/// Entity representing a normalized category/type of Raw Material
/// (e.g. Core Material, Insulation Material, Inner Sheath, Armour Wire, Outer Sheath).
/// </summary>
public class MaterialType : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Material> Materials { get; set; } = new List<Material>();
}
