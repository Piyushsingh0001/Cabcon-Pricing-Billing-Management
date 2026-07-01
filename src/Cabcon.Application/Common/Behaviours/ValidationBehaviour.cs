using Cabcon.Shared.Exceptions;
using FluentValidation;
using MediatR;

namespace Cabcon.Application.Common.Behaviours;

/// <summary>
/// MediatR pipeline behaviour that runs before every command/query handler.
/// Collects FluentValidation failures from all registered validators for the
/// request type and throws a single Cabcon.Shared.Exceptions.ValidationException
/// (caught by GlobalExceptionMiddleware -> HTTP 400) if any failed. Means
/// individual handlers never need an "if (!ModelState.IsValid)" check - they can
/// assume the request is already valid by the time they run.
/// </summary>
public class ValidationBehaviour<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehaviour(IEnumerable<IValidator<TRequest>> validators) => _validators = validators;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (!_validators.Any())
            return await next();

        var context = new ValidationContext<TRequest>(request);

        var failures = (await Task.WhenAll(_validators.Select(v => v.ValidateAsync(context, cancellationToken))))
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .GroupBy(f => f.PropertyName)
            .ToDictionary(g => g.Key, g => g.Select(f => f.ErrorMessage).ToArray());

        if (failures.Count != 0)
            throw new Cabcon.Shared.Exceptions.ValidationException(failures!);

        return await next();
    }
}
