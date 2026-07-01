using Microsoft.AspNetCore.Authorization;

namespace Cabcon.WebApi.Authorization;

/// <summary>
/// Usage: [HasPermission(AppPermissions.Sku.Delete)] on a controller action.
/// Translates to [Authorize(Policy = "Permission:Sku.Delete")], which
/// PermissionPolicyProvider turns into a PermissionRequirement evaluated by
/// PermissionAuthorizationHandler against the caller's JWT "permission" claims.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
public class HasPermissionAttribute : AuthorizeAttribute
{
    public HasPermissionAttribute(string permission) : base(policy: PermissionPolicyProvider.Prefix + permission) { }
}
