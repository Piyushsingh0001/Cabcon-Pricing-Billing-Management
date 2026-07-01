namespace Cabcon.Domain.Common;

/// <summary>
/// Base class for every persisted domain entity. Carries the mandatory enterprise
/// audit columns required across the whole schema (see Part 2 - Database Design).
/// Soft delete is enforced via <see cref="IsDeleted"/> + a global EF Core query filter,
/// so historical Quotations / PriceHistory rows always remain valid even if a
/// Material or Sku is later "deleted" from the active catalogue.
/// </summary>
public abstract class BaseEntity : IAuditable
{
    public int Id { get; set; }

    public DateTime CreatedDate { get; set; }
    public string? CreatedBy { get; set; }

    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }

    public DateTime? DeletedDate { get; set; }
    public string? DeletedBy { get; set; }

    public bool IsDeleted { get; set; }
}

/// <summary>
/// Marker interface used by SaveChanges interceptors to know an entity wants
/// audit-column stamping. All BaseEntity descendants implement it implicitly
/// via the base class; kept separate so non-entity types can opt in if needed.
/// </summary>
public interface IAuditable
{
    DateTime CreatedDate { get; set; }
    string? CreatedBy { get; set; }
    DateTime? UpdatedDate { get; set; }
    string? UpdatedBy { get; set; }
    DateTime? DeletedDate { get; set; }
    string? DeletedBy { get; set; }
    bool IsDeleted { get; set; }
}
