using Cabcon.Domain.Entities.Identity;

namespace Cabcon.Application.Common.Interfaces;

/// <summary>Generates short-lived signed JWT access tokens carrying identity,
/// role and permission claims. Implemented in Cabcon.Infrastructure using
/// System.IdentityModel.Tokens.Jwt against the Options-Pattern-bound JwtSettings.</summary>
public interface IJwtTokenGenerator
{
    /// <param name="user">The authenticated user (must have UserRoles.Role.RolePermissions loaded).</param>
    /// <param name="roles">Role names to embed as "role" claims.</param>
    /// <param name="permissions">Permission codes to embed as "permission" claims.</param>
    /// <returns>The signed JWT string and its UTC expiry.</returns>
    (string Token, DateTime ExpiresUtc) GenerateAccessToken(User user, IEnumerable<string> roles, IEnumerable<string> permissions);
}
