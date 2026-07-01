namespace Cabcon.Domain.Entities.Identity;

/// <summary>Many-to-many associative entity between User and Role (composite key, no surrogate Id).</summary>
public class UserRole
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;
}
