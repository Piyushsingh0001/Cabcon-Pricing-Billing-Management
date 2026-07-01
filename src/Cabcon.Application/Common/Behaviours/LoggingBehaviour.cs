using MediatR;
using Microsoft.Extensions.Logging;

namespace Cabcon.Application.Common.Behaviours;

/// <summary>Logs entry, exit and unhandled-exception for every MediatR request -
/// complements the HTTP-level RequestResponseLoggingMiddleware (WebApi) by
/// capturing the use-case name rather than just the route, which is more
/// meaningful in Serilog queries/dashboards (e.g. "LoginCommand failed 12 times").</summary>
public class LoggingBehaviour<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<LoggingBehaviour<TRequest, TResponse>> _logger;

    public LoggingBehaviour(ILogger<LoggingBehaviour<TRequest, TResponse>> logger) => _logger = logger;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var name = typeof(TRequest).Name;
        _logger.LogInformation("Handling {RequestName}", name);
        try
        {
            var response = await next();
            _logger.LogInformation("Handled {RequestName}", name);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception for {RequestName}", name);
            throw;
        }
    }
}
