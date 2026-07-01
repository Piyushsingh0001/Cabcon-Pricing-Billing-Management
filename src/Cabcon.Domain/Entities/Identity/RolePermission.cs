namespace Cabcon.Domain.Entities.Identity;

/// <summary>Many-to-many associative entity between Role and Permission (composite key, no surrogate Id).</summary>
public class RolePermission
{
    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;

    public int PermissionId { get; set; }
    public Permission Permission { get; set; } = null!;
}
