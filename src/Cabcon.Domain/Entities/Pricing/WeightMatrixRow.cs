using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Pricing;

/// <summary>
/// Master definition for a standard cable Specification and Variant row in the Weight Matrix.
/// Stores standard specifications (e.g. 2 C X 4 sq.mm., 3.5 C X 300 sq.mm.) and variants (e.g. 2XWY, 2XFY, A2XFY).
/// </summary>
public class WeightMatrixRow : BaseEntity
{
    public string Spec { get; set; } = string.Empty;
    public string Variant { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public ICollection<WeightMatrixWeight> Weights { get; set; } = new List<WeightMatrixWeight>();
}
