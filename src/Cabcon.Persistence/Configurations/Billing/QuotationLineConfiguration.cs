using Cabcon.Domain.Entities.Billing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Billing;

public class QuotationLineConfiguration : IEntityTypeConfiguration<QuotationLine>
{
    public void Configure(EntityTypeBuilder<QuotationLine> b)
    {
        b.ToTable("QuotationLines");
        b.HasKey(x => x.Id);

        b.Property(x => x.DescriptionSnapshot).HasMaxLength(300).IsRequired();
        b.Property(x => x.Unit).HasMaxLength(20).IsRequired();

        foreach (var prop in new[] { nameof(QuotationLine.RmCostSnapshot), nameof(QuotationLine.MfgCostSnapshot),
                                      nameof(QuotationLine.OfferExGst), nameof(QuotationLine.Profit), nameof(QuotationLine.GstAmount), nameof(QuotationLine.GrossRate) })
            b.Property(prop).HasColumnType("decimal(18,4)");

        b.Property(x => x.GstPercent).HasColumnType("decimal(9,4)");

        b.HasIndex(x => x.QuotationId);
    }
}
