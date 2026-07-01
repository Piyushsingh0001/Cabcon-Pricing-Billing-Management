using Cabcon.Domain.Entities.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Settings;

public class ApplicationSettingConfiguration : IEntityTypeConfiguration<ApplicationSetting>
{
    public void Configure(EntityTypeBuilder<ApplicationSetting> b)
    {
        b.ToTable("ApplicationSettings");
        b.HasKey(x => x.Id);
        b.Property(x => x.Key).HasMaxLength(150).IsRequired();
        b.Property(x => x.Value).HasMaxLength(1000).IsRequired();
        b.HasIndex(x => x.Key).IsUnique();
    }
}
