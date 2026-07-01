using System.Security.Cryptography;
using Cabcon.Application.Common.Interfaces;

namespace Cabcon.Infrastructure.Security;

/// <summary>
/// PBKDF2-HMACSHA256 password hashing (RFC 2898 / NIST SP 800-132 recommended
/// algorithm where bcrypt/Argon2 are unavailable out of the box). Chosen over a
/// fixed/static salt scheme because each hash embeds its OWN random salt, so
/// two users with the same password never produce the same stored hash
/// (defeats rainbow-table and cross-user comparison attacks).
///
/// Stored format: "{iterations}.{saltBase64}.{hashBase64}" - embedding the
/// iteration count means we can raise it in the future (as hardware gets
/// faster) without invalidating already-stored hashes; Verify() always reads
/// the iteration count FROM the stored value rather than assuming the current
/// default, so old and new hashes both verify correctly side by side.
/// </summary>
public class PasswordHasher : IPasswordHasher
{
    private const int Iterations = 100_000;
    private const int SaltSizeBytes = 16;   // 128-bit salt
    private const int KeySizeBytes = 32;    // 256-bit derived key

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSizeBytes);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySizeBytes);
        return $"{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(key)}";
    }

    public bool Verify(string password, string storedHash)
    {
        var parts = storedHash.Split('.', 3);
        if (parts.Length != 3 || !int.TryParse(parts[0], out var iterations))
            return false;

        byte[] salt, expectedKey;
        try
        {
            salt = Convert.FromBase64String(parts[1]);
            expectedKey = Convert.FromBase64String(parts[2]);
        }
        catch (FormatException)
        {
            return false;
        }

        var actualKey = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expectedKey.Length);

        // Constant-time comparison - prevents timing attacks from leaking how
        // many leading bytes matched.
        return CryptographicOperations.FixedTimeEquals(actualKey, expectedKey);
    }
}
