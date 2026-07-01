using Cabcon.Domain.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cabcon.Persistence.Configurations.Identity;

public class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> b)
    {
        b.ToTable("Permissions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(150).IsRequired();
        b.Property(x => x.Module).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.Code).IsUnique();

        var seedDate = new DateTime(2026, 1, 1);

        // Codes/order mirror Cabcon.Shared.Constants.AppPermissions exactly -
        // keep both in sync when adding a new permission (add the constant AND
        // a new HasData row with the next sequential Id; never reuse/reorder
        // existing Ids since RolePermissionConfiguration references them directly).
        b.HasData(
            new Permission { Id = 1, Code = "Users.View", Module = "Users", CreatedDate = seedDate },
            new Permission { Id = 2, Code = "Users.Create", Module = "Users", CreatedDate = seedDate },
            new Permission { Id = 3, Code = "Users.Update", Module = "Users", CreatedDate = seedDate },
            new Permission { Id = 4, Code = "Users.Delete", Module = "Users", CreatedDate = seedDate },
            new Permission { Id = 5, Code = "Users.ManageRoles", Module = "Users", CreatedDate = seedDate },
            new Permission { Id = 6, Code = "Roles.View", Module = "Roles", CreatedDate = seedDate },
            new Permission { Id = 7, Code = "Roles.Create", Module = "Roles", CreatedDate = seedDate },
            new Permission { Id = 8, Code = "Roles.Update", Module = "Roles", CreatedDate = seedDate },
            new Permission { Id = 9, Code = "Roles.Delete", Module = "Roles", CreatedDate = seedDate },
            new Permission { Id = 10, Code = "Roles.ManagePermissions", Module = "Roles", CreatedDate = seedDate },
            new Permission { Id = 11, Code = "Pricing.View", Module = "Pricing", CreatedDate = seedDate },
            new Permission { Id = 12, Code = "Pricing.Update", Module = "Pricing", CreatedDate = seedDate },
            new Permission { Id = 13, Code = "Sku.View", Module = "Sku", CreatedDate = seedDate },
            new Permission { Id = 14, Code = "Sku.Create", Module = "Sku", CreatedDate = seedDate },
            new Permission { Id = 15, Code = "Sku.Update", Module = "Sku", CreatedDate = seedDate },
            new Permission { Id = 16, Code = "Sku.Delete", Module = "Sku", CreatedDate = seedDate },
            new Permission { Id = 17, Code = "Quotation.View", Module = "Quotation", CreatedDate = seedDate },
            new Permission { Id = 18, Code = "Quotation.Generate", Module = "Quotation", CreatedDate = seedDate },
            new Permission { Id = 19, Code = "Settings.View", Module = "Settings", CreatedDate = seedDate },
            new Permission { Id = 20, Code = "Settings.Update", Module = "Settings", CreatedDate = seedDate }
        );
    }
}
