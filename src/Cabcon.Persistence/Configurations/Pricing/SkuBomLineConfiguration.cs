using Cabcon.Domain.Entities.Pricing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Pricing;

public class SkuBomLineConfiguration : IEntityTypeConfiguration<SkuBomLine>
{
    public void Configure(EntityTypeBuilder<SkuBomLine> b)
    {
        b.ToTable("SkuBomLines");
        b.HasKey(x => x.Id);
        b.Property(x => x.WeightKg).HasColumnType("decimal(18,6)");
        b.Property(x => x.ManualPrice).HasColumnType("decimal(18,2)");

        b.HasIndex(x => new { x.SkuId, x.MaterialId });
    }
}
