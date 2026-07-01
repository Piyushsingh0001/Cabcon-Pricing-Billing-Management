namespace Cabcon.WebApi.Middleware;

/// <summary>
/// Captures the authenticated user context for downstream audit-column stamping
/// (CreatedBy/UpdatedBy on every entity) and writes high-level AuditLog entries for
/// mutating requests (POST/PUT/PATCH/DELETE). Full implementation lands alongside
/// the AuditLogs entity in Part 2/3 and the audit module in Part 7.
/// </summary>
public class AuditTrackingMiddleware
{
    private readonly RequestDelegate _next;

    public AuditTrackingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // ICurrentUserService population from JWT claims happens here once
        // authentication is implemented (Part 4).
        await _next(context);
    }
}
