using Cabcon.Domain.Entities.Billing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Billing;

public class QuotationConfiguration : IEntityTypeConfiguration<Quotation>
{
    public void Configure(EntityTypeBuilder<Quotation> b)
    {
        b.ToTable("Quotations");
        b.HasKey(x => x.Id);

        b.Property(x => x.QuotationNumber).HasMaxLength(50).IsRequired();
        b.Property(x => x.PartyName).HasMaxLength(250).IsRequired();
        b.Property(x => x.PriceBasisNote).HasMaxLength(500);

        foreach (var prop in new[] { nameof(Quotation.TotalExGst), nameof(Quotation.TotalGst), nameof(Quotation.TotalGross) })
            b.Property(prop).HasColumnType("decimal(18,2)");

        b.HasIndex(x => x.QuotationNumber).IsUnique();
        b.HasIndex(x => x.QuotationDate);

        b.HasMany(x => x.Lines).WithOne(x => x.Quotation).HasForeignKey(x => x.QuotationId).OnDelete(DeleteBehavior.Cascade);
    }
}
