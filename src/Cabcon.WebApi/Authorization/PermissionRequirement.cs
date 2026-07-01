using Microsoft.AspNetCore.Authorization;

namespace Cabcon.WebApi.Authorization;

/// <summary>The single requirement type for every dynamic permission policy -
/// carries just the permission code that must be present as a "permission"
/// claim on the current user's JWT.</summary>
public class PermissionRequirement : IAuthorizationRequirement
{
    public string Permission { get; }
    public PermissionRequirement(string permission) => Permission = permission;
}
