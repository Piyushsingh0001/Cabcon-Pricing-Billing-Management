using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Identity;

/// <summary>
/// Single-use, short-lived token issued by "Forgot Password" and consumed by
/// "Reset Password". Stored hashed (same rationale as RefreshToken.TokenHash) -
/// only the hash ever touches the database, the raw token is emailed once and
/// never persisted in plaintext.
/// </summary>
public class PasswordResetToken : BaseEntity
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresUtc { get; set; }
    public DateTime? UsedUtc { get; set; }

    public bool IsActive => UsedUtc == null && DateTime.UtcNow < ExpiresUtc;
}
