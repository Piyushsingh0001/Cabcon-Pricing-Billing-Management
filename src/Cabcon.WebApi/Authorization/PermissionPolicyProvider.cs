using Microsoft.AspNetCore.Authorization;

namespace Cabcon.WebApi.Authorization;

/// <summary>
/// Generates an authorization Policy on the fly for any policy name prefixed
/// "Permission:" (see HasPermissionAttribute), instead of requiring every
/// single permission to be pre-registered with services.AddAuthorization() at
/// startup. This is what "Dynamic Authorization" means in practice: new
/// Permission rows can be added (and immediately enforced via
/// [HasPermission("NewModule.NewAction")] on a controller) without any change
/// to Program.cs.
/// </summary>
public class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    public const string Prefix = "Permission:";

    private readonly DefaultAuthorizationPolicyProvider _fallback;

    public PermissionPolicyProvider(Microsoft.Extensions.Options.IOptions<AuthorizationOptions> options) =>
        _fallback = new DefaultAuthorizationPolicyProvider(options);

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallback.GetDefaultPolicyAsync();

    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _fallback.GetFallbackPolicyAsync();

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (policyName.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase))
        {
            var permission = policyName[Prefix.Length..];
            var policy = new AuthorizationPolicyBuilder()
                .AddRequirements(new PermissionRequirement(permission))
                .Build();
            return Task.FromResult<AuthorizationPolicy?>(policy);
        }

        return _fallback.GetPolicyAsync(policyName);
    }
}
