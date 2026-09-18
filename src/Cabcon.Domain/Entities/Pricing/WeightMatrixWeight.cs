using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Pricing;

/// <summary>
/// Normalized associative entity storing the required correlation weight (kg per KM)
/// for a particular Material in a WeightMatrixRow (Spec &amp; Variant).
/// </summary>
public class WeightMatrixWeight : BaseEntity
{
    public int WeightMatrixRowId { get; set; }
    public WeightMatrixRow WeightMatrixRow { get; set; } = null!;

    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;

    /// <summary>Correlation weight in kg per KM for manufacturing.</summary>
    public decimal WeightKg { get; set; }
}
