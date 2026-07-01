namespace Cabcon.Infrastructure.Identity;

/// <summary>
/// Bound from appsettings.json "JwtSettings" section via the Options Pattern.
/// Populated fully in Part 4 (Authentication module).
/// </summary>
public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int AccessTokenExpiryMinutes { get; set; } = 15;
    public int RefreshTokenExpiryDays { get; set; } = 7;
}
