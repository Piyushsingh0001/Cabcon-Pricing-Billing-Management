namespace Cabcon.Shared.Exceptions;

/// <summary>Thrown by the FluentValidation MediatR pipeline behaviour when a
/// command/query fails validation. Maps to HTTP 400.</summary>
public class ValidationException : ApiException
{
    public IDictionary<string, string[]> Errors { get; }

    public ValidationException() : base("One or more validation failures occurred.")
        => Errors = new Dictionary<string, string[]>();

    public ValidationException(IDictionary<string, string[]> errors)
        : base("One or more validation failures occurred.")
        => Errors = errors;
}
