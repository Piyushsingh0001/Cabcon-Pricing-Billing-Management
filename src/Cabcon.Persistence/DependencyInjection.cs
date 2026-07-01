using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cabcon.Persistence;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistenceServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Connection string ALWAYS comes from configuration (appsettings.json /
        // environment / user-secrets) - never hardcoded, per project requirements.
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Connection string 'DefaultConnection' was not found in configuration.");

        services.AddDbContext<Context.CabconDbContext>(options =>
            options.UseSqlServer(connectionString, sql =>
                sql.MigrationsAssembly(typeof(DependencyInjection).Assembly.FullName)));

        services.AddScoped<Application.Common.Interfaces.IApplicationDbContext>(provider =>
            provider.GetRequiredService<Context.CabconDbContext>());

        services.AddScoped(typeof(Application.Common.Interfaces.IRepository<>), typeof(Repositories.EfRepository<>));
        services.AddScoped<Application.Common.Interfaces.IUnitOfWork, Repositories.UnitOfWork>();

        return services;
    }
}
