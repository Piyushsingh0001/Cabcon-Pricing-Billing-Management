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


        var seedDate = new DateTime(2026, 1, 1);

        // Default Admin user so the app is usable immediately after first migration.
        // Password is "Admin@123" - hashed with the same PBKDF2-HMACSHA256 scheme as
        // Cabcon.Infrastructure.Security.PasswordHasher (100,000 iterations, 16-byte
        // salt, 32-byte derived key, stored as "{iterations}.{saltB64}.{hashB64}").
        // CHANGE THIS PASSWORD IMMEDIATELY in any non-dev environment.
        b.HasData(new User
        {
            Id = 1,
            FullName = "System Administrator",
            Email = "admin@cabcon.local",
            UserName = "admin",
            PasswordHash = "100000.AQIDBAUGBwgJCgsMDQ4PEA==.7gQDaNbD2TJ9Tv/U3z+oOOw+byXCRpvOoV5EbjMrc1w=",
            EmailConfirmed = true,
            IsActive = true,
            SecurityStamp = "00000000-0000-0000-0000-000000000001",
            CreatedDate = seedDate
        });

        b.HasMany(x => x.UserRoles).WithOne(x => x.User).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.RefreshTokens).WithOne(x => x.User).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
