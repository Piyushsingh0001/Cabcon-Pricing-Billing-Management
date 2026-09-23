using Cabcon.Domain.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Identity;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.ToTable("Users");
        b.HasKey(x => x.Id);

        b.Property(x => x.FullName).HasMaxLength(200).IsRequired();
        b.Property(x => x.Email).HasMaxLength(256).IsRequired();
        b.Property(x => x.UserName).HasMaxLength(100).IsRequired();
        b.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
        b.Property(x => x.SecurityStamp).HasMaxLength(100);

        b.HasIndex(x => x.Email).IsUnique();
        b.HasIndex(x => x.UserName).IsUnique();




        b.HasMany(x => x.UserRoles).WithOne(x => x.User).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.RefreshTokens).WithOne(x => x.User).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
