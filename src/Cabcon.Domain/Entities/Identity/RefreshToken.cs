using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Identity;

public class RefreshToken : BaseEntity
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Stored hashed (never the raw token) so a DB leak doesn't expose usable tokens.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresUtc { get; set; }
    public DateTime? RevokedUtc { get; set; }
    public string? RevokedByIp { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public string? CreatedByIp { get; set; }

    public bool IsActive => RevokedUtc == null && DateTime.UtcNow < ExpiresUtc;
}
