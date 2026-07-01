using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Cabcon.Infrastructure.Identity;

/// <summary>
/// Builds a signed (HMAC-SHA256) JWT access token. Claims embedded:
///  - sub / nameidentifier: User.Id (int, as string)              -> "who"
///  - unique_name / name:   User.UserName                          -> display
///  - email:                User.Email
///  - "securityStamp":      User.SecurityStamp                     -> see below
///  - "role" (one per role): e.g. "Admin"                          -> ASP.NET Core
///        role claims feed [Authorize(Roles = "Admin")] automatically because
///        ClaimTypes.Role is what RoleClaimType is set to below.
///  - "permission" (one per permission code): e.g. "Pricing.Update" -> consumed
///        by the custom PermissionAuthorizationHandler (Part 5).
///
/// The "securityStamp" claim is the mechanism that lets a still-valid
/// (non-expired) JWT be invalidated early: JwtBearerEvents.OnTokenValidated
/// (wired in WebApi/Program.cs) compares this claim against the user's CURRENT
/// SecurityStamp value in the database on every request - if they differ
/// (password changed, "log out everywhere" used, or an admin force-revoked the
/// account), the token is rejected even though it hasn't technically expired yet.
/// </summary>
public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly JwtSettings _settings;

    public JwtTokenGenerator(IOptions<JwtSettings> settings) => _settings = settings.Value;

    public (string Token, DateTime ExpiresUtc) GenerateAccessToken(User user, IEnumerable<string> roles, IEnumerable<string> permissions)
    {
        var expiresUtc = DateTime.UtcNow.AddMinutes(_settings.AccessTokenExpiryMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.UserName),
            new(ClaimTypes.Email, user.Email),
            new("fullName", user.FullName),
            new("securityStamp", user.SecurityStamp),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
        claims.AddRange(permissions.Select(p => new Claim("permission", p)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresUtc,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresUtc);
    }
}
