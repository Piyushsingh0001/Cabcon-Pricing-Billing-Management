using Cabcon.Domain.Entities.Pricing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Pricing;

public class MaterialConfiguration : IEntityTypeConfiguration<Material>
{
    public void Configure(EntityTypeBuilder<Material> b)
    {
        b.ToTable("Materials");
        b.HasKey(x => x.Id);

        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);

        // money-style columns: 18 digits total, 4 after the decimal point (matches
        // the HTML's free-form decimal inputs without losing precision on landed-cost math)
        foreach (var prop in new[] { nameof(Material.LmeUsdPerMt), nameof(Material.PremiumUsdPerMt),
                                      nameof(Material.FxRate), nameof(Material.FreightInrPerMt),
                                      nameof(Material.DirectRateInrPerKg) })
        {
            b.Property(prop).HasColumnType("decimal(18,4)");
        }

        b.HasIndex(x => new { x.Name, x.VendorName }).IsUnique();

        b.HasMany(x => x.PriceHistory).WithOne(x => x.Material).HasForeignKey(x => x.MaterialId).OnDelete(DeleteBehavior.Cascade);
        // Restrict: a Material referenced by a live BOM line cannot be hard-deleted -
        // only soft-deleted (IsDeleted=true), preserving cost-history integrity.
        b.HasMany(x => x.BomLines).WithOne(x => x.Material).HasForeignKey(x => x.MaterialId).OnDelete(DeleteBehavior.Restrict);
    }
}
