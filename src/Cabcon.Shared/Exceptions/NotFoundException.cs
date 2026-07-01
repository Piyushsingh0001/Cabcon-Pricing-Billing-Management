namespace Cabcon.Shared.Exceptions;

/// <summary>Thrown when a requested entity does not exist (or is soft-deleted).
/// Maps to HTTP 404.</summary>
public class NotFoundException : ApiException
{
    public NotFoundException(string name, object key)
        : base($"Entity \"{name}\" ({key}) was not found.") { }

    public NotFoundException(string message) : base(message) { }
}
