namespace Cabcon.Application.Common.Interfaces;

/// <summary>Testable wrapper around DateTime.UtcNow - handlers depend on this
/// instead of calling DateTime.UtcNow directly, so unit tests can freeze time.</summary>
public interface IDateTime
{
    DateTime UtcNow { get; }
}
