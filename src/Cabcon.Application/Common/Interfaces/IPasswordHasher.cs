namespace Cabcon.Application.Common.Interfaces;

/// <summary>
/// Abstraction over the password hashing algorithm. Implemented in
/// Cabcon.Infrastructure (PBKDF2-HMACSHA256) - kept as an interface here so the
/// Application layer (and unit tests) never depend on a concrete crypto library,
/// and so the algorithm can be swapped/upgraded later without touching any
/// command/query handler.
/// </summary>
public interface IPasswordHasher
{
    /// <summary>Hashes a plaintext password into the storable "{iterations}.{saltB64}.{hashB64}" format.</summary>
    string Hash(string password);

    /// <summary>Verifies a plaintext password against a previously stored hash. Constant-time comparison.</summary>
    bool Verify(string password, string storedHash);
}
