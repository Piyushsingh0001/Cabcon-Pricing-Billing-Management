using Cabcon.Domain.Entities.Audit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Audit;

public class LoginHistoryConfiguration : IEntityTypeConfiguration<LoginHistory>
{
    public void Configure(EntityTypeBuilder<LoginHistory> b)
    {
        b.ToTable("LoginHistory");
        b.HasKey(x => x.Id);
        b.Property(x => x.UserNameAttempted).HasMaxLength(100).IsRequired();
        b.Property(x => x.EventType).HasMaxLength(20).IsRequired();
        b.HasIndex(x => x.EventTimestampUtc);
        b.HasIndex(x => x.UserId);
    }
}
