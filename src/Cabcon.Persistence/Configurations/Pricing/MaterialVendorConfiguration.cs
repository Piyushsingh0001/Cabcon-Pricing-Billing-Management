using Cabcon.Domain.Entities.Pricing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Pricing;

public class MaterialVendorConfiguration : IEntityTypeConfiguration<MaterialVendor>
{
    public void Configure(EntityTypeBuilder<MaterialVendor> b)
    {
        b.ToTable("MaterialVendors");
        b.HasKey(x => x.Id);

        b.HasIndex(x => new { x.MaterialId, x.VendorId }).IsUnique();

        b.HasOne(x => x.Material)
            .WithMany(m => m.MaterialVendors)
            .HasForeignKey(x => x.MaterialId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.Vendor)
            .WithMany(v => v.MaterialVendors)
            .HasForeignKey(x => x.VendorId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
