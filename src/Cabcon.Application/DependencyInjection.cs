using System.Reflection;
using Cabcon.Application.Common.Behaviours;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Cabcon.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
        services.AddAutoMapper(assembly);
        services.AddValidatorsFromAssembly(assembly);

        // Cross-cutting MediatR pipeline behaviours - order matters: Logging wraps
        // everything (so it can log start/end/exception of the whole pipeline
        // including validation failures), Validation runs before the actual handler.
        services.AddTransient(typeof(MediatR.IPipelineBehavior<,>), typeof(LoggingBehaviour<,>));
        services.AddTransient(typeof(MediatR.IPipelineBehavior<,>), typeof(ValidationBehaviour<,>));

        return services;
    }
}
