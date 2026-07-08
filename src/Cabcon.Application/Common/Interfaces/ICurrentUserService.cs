namespace Cabcon.Application.Common.Interfaces;

/// <summary>
/// Abstraction over "who is making this request", populated from JWT claims by
/// AuditTrackingMiddleware (WebApi layer). Consumed by CabconDbContext for audit-column
/// stamping and by Application handlers for permission checks. Concrete implementation
/// (reading HttpContext.User claims) lands in Part 4 - Authentication module.
/// </summary>
public interface ICurrentUserService
{
    int? UserId { get; }
    string? UserName { get; }
    string? IpAddress { get; }
    IReadOnlyCollection<string> Permissions { get; }
    IReadOnlyCollection<string> Roles { get; }
}
