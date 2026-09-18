using Cabcon.Domain.Entities.Pricing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Pricing;

public class WeightMatrixRowConfiguration : IEntityTypeConfiguration<WeightMatrixRow>
{
    public void Configure(EntityTypeBuilder<WeightMatrixRow> b)
    {
        b.ToTable("WeightMatrixRows");
        b.HasKey(x => x.Id);
        b.Property(x => x.Spec).HasMaxLength(150).IsRequired();
        b.Property(x => x.Variant).HasMaxLength(150).IsRequired();

        b.HasMany(x => x.Weights)
            .WithOne(x => x.WeightMatrixRow)
            .HasForeignKey(x => x.WeightMatrixRowId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => new { x.Spec, x.Variant });
    }
}

public class WeightMatrixWeightConfiguration : IEntityTypeConfiguration<WeightMatrixWeight>
{
    public void Configure(EntityTypeBuilder<WeightMatrixWeight> b)
    {
        b.ToTable("WeightMatrixWeights");
        b.HasKey(x => x.Id);
        b.Property(x => x.WeightKg).HasColumnType("decimal(18,6)");

        b.HasOne(x => x.Material)
            .WithMany()
            .HasForeignKey(x => x.MaterialId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(x => new { x.WeightMatrixRowId, x.MaterialId });
    }
}
