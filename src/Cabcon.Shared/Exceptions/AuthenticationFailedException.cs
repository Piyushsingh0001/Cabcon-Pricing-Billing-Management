namespace Cabcon.Shared.Exceptions;

/// <summary>Thrown for failed login / invalid or expired token. Maps to HTTP 401.
/// Deliberately generic message ("invalid credentials") regardless of whether the
/// username was unknown or the password was wrong, to avoid user-enumeration.</summary>
public class AuthenticationFailedException : ApiException
{
    public AuthenticationFailedException(string message) : base(message) { }
}
