using Microsoft.EntityFrameworkCore;

namespace Cabcon.Persistence.Seed;

/// <summary>
/// Hook for seeding database entities. Hardcoded entities have been removed
/// so all domain and pricing entities are loaded and managed strictly from the database.
/// </summary>
public static class PricingSeedData
{
    public static void Apply(ModelBuilder modelBuilder)
    {
        // Hardcoded static model seeding removed.
        // All categories, materials, skus, and pricing entities are managed dynamically via the database.
    }
}
