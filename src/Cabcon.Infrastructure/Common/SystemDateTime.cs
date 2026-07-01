using Cabcon.Application.Common.Interfaces;

namespace Cabcon.Infrastructure.Common;

/// <summary>Production implementation of IDateTime - thin wrapper so Application
/// handlers never call DateTime.UtcNow directly (keeps them unit-testable).</summary>
public class SystemDateTime : IDateTime
{
    public DateTime UtcNow => DateTime.UtcNow;
}
