using Cabcon.Domain.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Identity;

public class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission>
{
    public void Configure(EntityTypeBuilder<RolePermission> b)
    {
        b.ToTable("RolePermissions");
        b.HasKey(x => new { x.RoleId, x.PermissionId });

        b.HasOne(x => x.Role).WithMany(x => x.RolePermissions).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Permission).WithMany(x => x.RolePermissions).HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);

        // Admin (RoleId=1): every permission (1-20).
        // Manager (RoleId=2): Users.View + full Pricing/Sku/Quotation + Settings.View.
        // User (RoleId=3): read-only Pricing/Sku + Quotation.View/Generate (self-service quoting).
        b.HasData(
            new RolePermission { RoleId = 1, PermissionId = 1 },
            new RolePermission { RoleId = 1, PermissionId = 2 },
            new RolePermission { RoleId = 1, PermissionId = 3 },
            new RolePermission { RoleId = 1, PermissionId = 4 },
            new RolePermission { RoleId = 1, PermissionId = 5 },
            new RolePermission { RoleId = 1, PermissionId = 6 },
            new RolePermission { RoleId = 1, PermissionId = 7 },
            new RolePermission { RoleId = 1, PermissionId = 8 },
            new RolePermission { RoleId = 1, PermissionId = 9 },
            new RolePermission { RoleId = 1, PermissionId = 10 },
            new RolePermission { RoleId = 1, PermissionId = 11 },
            new RolePermission { RoleId = 1, PermissionId = 12 },
            new RolePermission { RoleId = 1, PermissionId = 13 },
            new RolePermission { RoleId = 1, PermissionId = 14 },
            new RolePermission { RoleId = 1, PermissionId = 15 },
            new RolePermission { RoleId = 1, PermissionId = 16 },
            new RolePermission { RoleId = 1, PermissionId = 17 },
            new RolePermission { RoleId = 1, PermissionId = 18 },
            new RolePermission { RoleId = 1, PermissionId = 19 },
            new RolePermission { RoleId = 1, PermissionId = 20 },
            new RolePermission { RoleId = 2, PermissionId = 1 },
            new RolePermission { RoleId = 2, PermissionId = 11 },
            new RolePermission { RoleId = 2, PermissionId = 12 },
            new RolePermission { RoleId = 2, PermissionId = 13 },
            new RolePermission { RoleId = 2, PermissionId = 14 },
            new RolePermission { RoleId = 2, PermissionId = 15 },
            new RolePermission { RoleId = 2, PermissionId = 16 },
            new RolePermission { RoleId = 2, PermissionId = 17 },
            new RolePermission { RoleId = 2, PermissionId = 18 },
            new RolePermission { RoleId = 2, PermissionId = 19 },
            new RolePermission { RoleId = 3, PermissionId = 11 },
            new RolePermission { RoleId = 3, PermissionId = 13 },
            new RolePermission { RoleId = 3, PermissionId = 17 },
            new RolePermission { RoleId = 3, PermissionId = 18 }
        );
    }
}
