using Cabcon.Domain.Entities.Pricing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Pricing;

public class MaterialPriceHistoryConfiguration : IEntityTypeConfiguration<MaterialPriceHistory>
{
    public void Configure(EntityTypeBuilder<MaterialPriceHistory> b)
    {
        b.ToTable("MaterialPriceHistory");
        b.HasKey(x => x.Id);
        b.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);

        foreach (var prop in new[] { nameof(MaterialPriceHistory.LmeUsdPerMt), nameof(MaterialPriceHistory.PremiumUsdPerMt),
                                      nameof(MaterialPriceHistory.FxRate), nameof(MaterialPriceHistory.FreightInrPerKg),
                                      nameof(MaterialPriceHistory.DirectRateInrPerKg), nameof(MaterialPriceHistory.LandedCostInrPerKg) })
        {
            b.Property(prop).HasColumnType("decimal(18,4)");
        }

        b.HasIndex(x => new { x.MaterialId, x.EffectiveDate });

        b.HasOne(x => x.Vendor)
            .WithMany(v => v.PriceHistories)
            .HasForeignKey(x => x.VendorId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
