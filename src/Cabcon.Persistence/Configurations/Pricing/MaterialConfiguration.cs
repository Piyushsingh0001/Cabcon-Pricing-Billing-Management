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
        b.Property(x => x.Density).HasColumnType("decimal(18,4)");
        b.HasIndex(x => x.Name);

        b.HasOne(x => x.MaterialType)
            .WithMany(x => x.Materials)
            .HasForeignKey(x => x.MaterialTypeId)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasMany(x => x.PriceHistory)
            .WithOne(x => x.Material)
            .HasForeignKey(x => x.MaterialId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(x => x.MaterialVendors)
            .WithOne(x => x.Material)
            .HasForeignKey(x => x.MaterialId)
            .OnDelete(DeleteBehavior.Cascade);

        // Restrict: a Material referenced by a live BOM line cannot be hard-deleted -
        // only soft-deleted (IsDeleted=true), preserving cost-history integrity.
        b.HasMany(x => x.BomLines)
            .WithOne(x => x.Material)
            .HasForeignKey(x => x.MaterialId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
