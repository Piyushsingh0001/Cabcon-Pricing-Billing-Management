using Cabcon.Domain.Entities.Audit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Audit;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> b)
    {
        b.ToTable("AuditLogs");
        b.HasKey(x => x.Id);
        b.Property(x => x.Module).HasMaxLength(100).IsRequired();
        b.Property(x => x.Action).HasMaxLength(50).IsRequired();
        b.Property(x => x.EntityName).HasMaxLength(150).IsRequired();
        b.Property(x => x.OldValues).HasColumnType("nvarchar(max)");
        b.Property(x => x.NewValues).HasColumnType("nvarchar(max)");
        b.HasIndex(x => x.TimestampUtc);
        b.HasIndex(x => new { x.Module, x.EntityId });
    }
}
