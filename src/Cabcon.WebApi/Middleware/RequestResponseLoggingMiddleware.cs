using System.Diagnostics;
using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Audit;
using Cabcon.Persistence.Context;

namespace Cabcon.WebApi.Middleware;

/// <summary>
/// Logs every API request/response (method, path, status code, duration, user) to the
/// ApiRequestLogs table.
/// </summary>
public class RequestResponseLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestResponseLoggingMiddleware> _logger;

    public RequestResponseLoggingMiddleware(RequestDelegate next, ILogger<RequestResponseLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        await _next(context);
        sw.Stop();

        _logger.LogInformation(
            "{Method} {Path} responded {StatusCode} in {Elapsed}ms",
            context.Request.Method, context.Request.Path,
            context.Response.StatusCode, sw.ElapsedMilliseconds);

        try
        {
            // Do not log request responses for static files or Swagger UI to avoid database noise
            var path = context.Request.Path.Value ?? string.Empty;
            if (path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
            {
                var db = context.RequestServices.GetRequiredService<CabconDbContext>();
                var currentUser = context.RequestServices.GetService<ICurrentUserService>();

                var log = new ApiRequestLog
                {
                    Method = context.Request.Method,
                    Path = path,
                    QueryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : null,
                    StatusCode = context.Response.StatusCode,
                    ElapsedMilliseconds = sw.ElapsedMilliseconds,
                    UserId = currentUser?.UserId,
                    IpAddress = currentUser?.IpAddress ?? context.Connection.RemoteIpAddress?.ToString(),
                    TimestampUtc = DateTime.UtcNow
                };

                db.ApiRequestLogs.Add(log);
                await db.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            // Fail-silent for DB logging so audit failures don't crash core user transactions
            _logger.LogError(ex, "Failed to persist API request log to database.");
        }
    }
}
