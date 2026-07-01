using Cabcon.Domain.Entities.Audit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Audit;

public class ApiRequestLogConfiguration : IEntityTypeConfiguration<ApiRequestLog>
{
    public void Configure(EntityTypeBuilder<ApiRequestLog> b)
    {
        b.ToTable("ApiRequestLogs");
        b.HasKey(x => x.Id);
        b.Property(x => x.Method).HasMaxLength(10).IsRequired();
        b.Property(x => x.Path).HasMaxLength(500).IsRequired();
        b.HasIndex(x => x.TimestampUtc);
    }
}
