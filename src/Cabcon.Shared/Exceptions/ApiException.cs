namespace Cabcon.Shared.Exceptions;

/// <summary>Base type for every hand-thrown exception in the system, caught by
/// GlobalExceptionMiddleware and translated to a consistent ProblemDetails response.</summary>
public abstract class ApiException : Exception
{
    protected ApiException(string message) : base(message) { }
}
