namespace Cabcon.Application.Common.Interfaces;

/// <summary>
/// Generates opaque (non-JWT) refresh tokens. Kept separate from access-token
/// generation because refresh tokens are random bytes (no embedded claims, no
/// signature to verify) that are looked up by hash in the database and rotated
/// on every use - a fundamentally different mechanism from a stateless JWT.
/// </summary>
public interface IRefreshTokenGenerator
{
    /// <returns>The raw token (sent to the client once) and its SHA-256 hash (persisted).</returns>
    (string RawToken, string TokenHash) Generate();

    /// <summary>Re-hashes a raw token presented by the client, for DB lookup/comparison.</summary>
    string Hash(string rawToken);

    /// <summary>How long a freshly-issued refresh token should remain valid - sourced
    /// from JwtSettings.RefreshTokenExpiryDays in the Infrastructure implementation, so
    /// Application-layer handlers can compute ExpiresUtc without depending on
    /// Cabcon.Infrastructure or the Options Pattern directly.</summary>
    TimeSpan Lifetime { get; }
}
