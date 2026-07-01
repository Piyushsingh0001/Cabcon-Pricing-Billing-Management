using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Audit;

public class ExceptionLog : BaseEntity
{
    public string Message { get; set; } = string.Empty;
    public string? StackTrace { get; set; }
    public string? Source { get; set; }
    public string? Path { get; set; }
    public int? UserId { get; set; }
    public string? TraceId { get; set; }
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
}
