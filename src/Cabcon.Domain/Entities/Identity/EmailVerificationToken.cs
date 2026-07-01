using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Identity;

/// <summary>
/// Token emailed at registration (or on "resend verification email") and consumed
/// by ConfirmEmail. Same hashed-storage / single-use / expiry pattern as
/// PasswordResetToken - kept as a separate entity (rather than reusing one
/// generic "Token" table) so the two concerns can evolve independently and
/// each has an unambiguous, self-documenting name in the schema.
/// </summary>
public class EmailVerificationToken : BaseEntity
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresUtc { get; set; }
    public DateTime? UsedUtc { get; set; }

    public bool IsActive => UsedUtc == null && DateTime.UtcNow < ExpiresUtc;
}
