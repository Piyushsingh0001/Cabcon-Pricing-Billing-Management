using Cabcon.Domain.Entities.Audit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Audit;

public class ExceptionLogConfiguration : IEntityTypeConfiguration<ExceptionLog>
{
    public void Configure(EntityTypeBuilder<ExceptionLog> b)
    {
        b.ToTable("ExceptionLogs");
        b.HasKey(x => x.Id);
        b.Property(x => x.Message).HasMaxLength(2000).IsRequired();
        b.Property(x => x.StackTrace).HasColumnType("nvarchar(max)");
        b.HasIndex(x => x.TimestampUtc);
    }
}
