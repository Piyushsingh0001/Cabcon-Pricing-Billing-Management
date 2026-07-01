using Cabcon.Domain.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Identity;

public class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> b)
    {
        b.ToTable("Roles");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.Name).IsUnique();

        b.HasData(
            new Role { Id = 1, Name = "Admin", Description = "Full system access", CreatedDate = new DateTime(2026, 1, 1) },
            new Role { Id = 2, Name = "Manager", Description = "Pricing & product management", CreatedDate = new DateTime(2026, 1, 1) },
            new Role { Id = 3, Name = "User", Description = "Read-only / quotation generation", CreatedDate = new DateTime(2026, 1, 1) }
        );
    }
}
