using System.Text;
using Cabcon.Application;
using Cabcon.Application.Common.Interfaces;
using Cabcon.Infrastructure;
using Cabcon.Infrastructure.Identity;
using Cabcon.Persistence;
using Cabcon.Persistence.Context;
using Cabcon.WebApi.Authorization;
using Cabcon.WebApi.Middleware;
using Cabcon.WebApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ---- Serilog bootstrap (reads sinks from appsettings.json: SQL Server + rolling file) ----
builder.Host.UseSerilog((ctx, services, cfg) =>
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .ReadFrom.Services(services)
       .Enrich.FromLogContext());

// ---- Layer registrations (each project exposes its own AddXxx(IServiceCollection) extension) ----
builder.Services
    .AddApplicationServices()                              // MediatR, AutoMapper, FluentValidation, pipeline behaviours
    .AddPersistenceServices(builder.Configuration)          // DbContext, Repositories, UnitOfWork
    .AddInfrastructureServices(builder.Configuration);      // JWT/RefreshToken generators, PasswordHasher, Email

// ---- Presentation-layer services ----
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Cabcon Pricing & Billing API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new()
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter JWT access token (no 'Bearer ' prefix needed)"
    });
    c.AddSecurityRequirement(new()
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ---- JWT Bearer authentication (PART 4) ----
// Token validation parameters mirror exactly what JwtTokenGenerator signs: same
// secret key (HMAC-SHA256, symmetric - issuer and validator share one secret,
// read from configuration/user-secrets, never hardcoded), issuer and audience.
// ClockSkew is zeroed so an expired token is rejected at the exact configured
// instant rather than ASP.NET Core's 5-minute default grace window.
var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>()
    ?? throw new InvalidOperationException("JwtSettings configuration section is missing.");

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        // Security-stamp live check: even a non-expired, signature-valid JWT is
        // rejected here if the embedded "securityStamp" claim no longer matches
        // User.SecurityStamp in the database - this is what makes ChangePassword/
        // RevokeAllTokens/AssignRolesToUser able to invalidate already-issued
        // access tokens immediately instead of waiting for natural expiry.
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var userIdClaim = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var stampClaim = context.Principal?.FindFirst("securityStamp")?.Value;

                if (!int.TryParse(userIdClaim, out var userId) || stampClaim is null)
                {
                    context.Fail("Invalid token claims.");
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<CabconDbContext>();
                var currentStamp = await db.Users
                    .Where(u => u.Id == userId && u.IsActive && !u.IsLockedOut)
                    .Select(u => u.SecurityStamp)
                    .FirstOrDefaultAsync();

                if (currentStamp is null || currentStamp != stampClaim)
                    context.Fail("Token is no longer valid - the account's security state has changed. Please log in again.");
            }
        };
    });

// ---- Permission-based dynamic authorization (PART 5) ----
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularClient", policy =>
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                            ?? ["http://localhost:4200"])
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ---- Middleware pipeline (order matters - matches Request Flow in architecture doc) ----
// GlobalException wraps everything so it can catch exceptions from any later
// middleware too. RequestResponseLogging captures the raw HTTP exchange.
// UseAuthentication MUST precede UseAuthorization (you can't authorize an
// identity that hasn't been established yet). AuditTracking runs last, after
// the principal is known, so it can attribute the request to a user.
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseMiddleware<RequestResponseLoggingMiddleware>();

app.UseHttpsRedirection();
app.UseCors("AngularClient");

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<AuditTrackingMiddleware>();

app.MapControllers();

app.Run();
