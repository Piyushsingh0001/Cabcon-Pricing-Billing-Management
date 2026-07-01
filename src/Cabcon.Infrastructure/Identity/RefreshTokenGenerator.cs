using System.Security.Cryptography;
using Cabcon.Application.Common.Interfaces;

namespace Cabcon.Infrastructure.Identity;

/// <summary>
/// Refresh tokens are opaque random bytes - NOT JWTs - because they carry no
/// claims and their only job is "prove you're the same client we issued a
/// token to, by hash lookup". Generated with a CSPRNG (256-bit, well above the
/// 128-bit minimum generally considered secure) and stored only as a SHA-256
/// hash, exactly like the password-reset/email-verification tokens, so that a
/// read-only database compromise (e.g. an exposed backup) does not hand an
/// attacker any usable session tokens.
/// </summary>
public class RefreshTokenGenerator : IRefreshTokenGenerator
{
    private const int TokenSizeBytes = 32; // 256-bit
    private readonly JwtSettings _settings;

    public RefreshTokenGenerator(Microsoft.Extensions.Options.IOptions<JwtSettings> settings) => _settings = settings.Value;

    public TimeSpan Lifetime => TimeSpan.FromDays(_settings.RefreshTokenExpiryDays);

    public (string RawToken, string TokenHash) Generate()
    {
        var bytes = RandomNumberGenerator.GetBytes(TokenSizeBytes);
        var rawToken = Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_'); // URL-safe
        return (rawToken, Hash(rawToken));
    }

    public string Hash(string rawToken)
    {
        var bytes = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToBase64String(bytes);
    }
}
