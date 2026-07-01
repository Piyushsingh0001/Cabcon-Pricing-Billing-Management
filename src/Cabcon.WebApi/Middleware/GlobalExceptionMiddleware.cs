using System.Net;
using System.Text.Json;
using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Audit;
using Cabcon.Persistence.Context;
using Cabcon.Shared.Exceptions;
using ValidationException = Cabcon.Shared.Exceptions.ValidationException;

namespace Cabcon.WebApi.Middleware;

/// <summary>
/// Catches every exception that escapes a controller action and maps
/// them to the correct HTTP status code. Logs unexpected errors to the ExceptionLogs table.
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var (statusCode, message, errors) = Map(ex);

            if (statusCode == HttpStatusCode.InternalServerError)
                _logger.LogError(ex, "Unhandled exception processing {Method} {Path}", context.Request.Method, context.Request.Path);
            else
                _logger.LogWarning(ex, "{ExceptionType} processing {Method} {Path}: {Message}", ex.GetType().Name, context.Request.Method, context.Request.Path, ex.Message);

            try
            {
                var db = context.RequestServices.GetRequiredService<CabconDbContext>();
                var currentUser = context.RequestServices.GetService<ICurrentUserService>();

                var log = new ExceptionLog
                {
                    Message = ex.Message,
                    StackTrace = ex.StackTrace,
                    Source = ex.Source,
                    Path = context.Request.Path,
                    UserId = currentUser?.UserId,
                    TraceId = context.TraceIdentifier,
                    TimestampUtc = DateTime.UtcNow
                };

                db.ExceptionLogs.Add(log);
                await db.SaveChangesAsync();
            }
            catch (Exception dbEx)
            {
                _logger.LogError(dbEx, "Failed to persist exception log to database.");
            }

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)statusCode;

            var payload = JsonSerializer.Serialize(new
            {
                success = false,
                message,
                errors,
                traceId = context.TraceIdentifier
            });

            await context.Response.WriteAsync(payload);
        }
    }

    private static (HttpStatusCode StatusCode, string Message, object? Errors) Map(Exception ex) => ex switch
    {
        ValidationException vex => (HttpStatusCode.BadRequest, vex.Message, vex.Errors),
        NotFoundException nf => (HttpStatusCode.NotFound, nf.Message, null),
        AuthenticationFailedException auth => (HttpStatusCode.Unauthorized, auth.Message, null),
        ForbiddenAccessException forbidden => (HttpStatusCode.Forbidden, forbidden.Message, null),
        _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred. Please try again or contact support.", null)
    };
}
