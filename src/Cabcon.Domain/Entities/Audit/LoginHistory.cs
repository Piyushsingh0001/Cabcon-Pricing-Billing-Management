using Cabcon.Domain.Common;

namespace Cabcon.Domain.Entities.Audit;

public class LoginHistory : BaseEntity
{
    public int? UserId { get; set; }
    public string UserNameAttempted { get; set; } = string.Empty;

    public bool IsSuccessful { get; set; }
    public string? FailureReason { get; set; }              // "InvalidPassword", "LockedOut", "NotFound"...

    public string EventType { get; set; } = "Login";         // "Login" | "Logout"
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime EventTimestampUtc { get; set; } = DateTime.UtcNow;
}
