using Cabcon.Application.Common.Interfaces;
using Cabcon.Infrastructure.Common;
using Cabcon.Infrastructure.Email;
using Cabcon.Infrastructure.Identity;
using Cabcon.Infrastructure.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cabcon.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Options Pattern: settings bound from configuration sections, validated
        // and injected as IOptions<T> wherever needed - never read ad-hoc via
        // IConfiguration["..."] strings scattered around the codebase.
        services.Configure<JwtSettings>(configuration.GetSection("JwtSettings"));
        services.Configure<EmailSettings>(configuration.GetSection("EmailSettings"));

        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddSingleton<IRefreshTokenGenerator, RefreshTokenGenerator>();
        services.AddSingleton<IDateTime, SystemDateTime>();
        services.AddScoped<IEmailService, SmtpEmailService>();

        return services;
    }
}
