using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Audit;

public class ApiRequestLog : BaseEntity
{
    public string Method { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string? QueryString { get; set; }
    public int StatusCode { get; set; }
    public long ElapsedMilliseconds { get; set; }
    public int? UserId { get; set; }
    public string? IpAddress { get; set; }
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
}
