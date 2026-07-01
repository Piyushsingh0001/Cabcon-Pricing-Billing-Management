using Cabcon.Domain.Entities.Pricing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Pricing;

public class SkuConfiguration : IEntityTypeConfiguration<Sku>
{
    public void Configure(EntityTypeBuilder<Sku> b)
    {
        b.ToTable("Skus");
        b.HasKey(x => x.Id);

        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Spec).HasMaxLength(200).IsRequired();
        b.Property(x => x.Unit).HasMaxLength(20).IsRequired();
        b.Property(x => x.ConversionType).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.ConversionValue).HasColumnType("decimal(18,6)");
        b.Property(x => x.GstRate).HasColumnType("decimal(9,4)");

        // a category cannot have two identical (spec+unit) active products
        b.HasIndex(x => new { x.CategoryId, x.Name, x.Spec, x.Unit }).IsUnique();

        b.HasMany(x => x.BomLines).WithOne(x => x.Sku).HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Cascade);

        // Restrict: historical QuotationLines must survive even if the Sku is later removed
        b.HasMany(x => x.QuotationLines).WithOne(x => x.Sku).HasForeignKey(x => x.SkuId).OnDelete(DeleteBehavior.Restrict);
    }
}
