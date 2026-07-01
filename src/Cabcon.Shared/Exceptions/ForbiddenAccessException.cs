namespace Cabcon.Shared.Exceptions;

/// <summary>Thrown when an authenticated user lacks the role/permission/claim
/// required for the operation. Maps to HTTP 403.</summary>
public class ForbiddenAccessException : ApiException
{
    public ForbiddenAccessException(string message = "You do not have permission to perform this action.")
        : base(message) { }
}
