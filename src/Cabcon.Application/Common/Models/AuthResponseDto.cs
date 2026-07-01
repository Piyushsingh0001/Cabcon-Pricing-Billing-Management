namespace Cabcon.Application.Common.Models;

/// <summary>
/// Payload returned by Login / RefreshToken. The Angular AuthService stores
/// AccessToken in memory (never localStorage, to limit XSS blast radius) and
/// receives RefreshToken either in the body (SPA) or as an HttpOnly cookie
/// (set by AuthController) depending on deployment choice - see Part 9.
/// </summary>
public class AuthResponseDto
{
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
    public DateTime AccessTokenExpiresUtc { get; set; }
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime RefreshTokenExpiresUtc { get; set; }
    public IReadOnlyCollection<string> Roles { get; set; } = Array.Empty<string>();
    public IReadOnlyCollection<string> Permissions { get; set; } = Array.Empty<string>();
}
