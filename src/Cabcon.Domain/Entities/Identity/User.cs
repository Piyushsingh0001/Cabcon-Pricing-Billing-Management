using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Identity;

public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;

    public bool EmailConfirmed { get; set; }
    public bool IsActive { get; set; } = true;

    // Lockout / failed-login tracking (Part 4 - Authentication)
    public int AccessFailedCount { get; set; }
    public bool IsLockedOut { get; set; }
    public DateTime? LockoutEndUtc { get; set; }

    // Rotated on every password change / explicit "log out everywhere" - invalidates
    // previously issued JWTs that embed the stamp as a claim.
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");

    public DateTime? LastLoginDate { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
