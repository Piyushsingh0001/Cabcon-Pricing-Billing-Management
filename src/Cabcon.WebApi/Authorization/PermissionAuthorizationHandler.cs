using Cabcon.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;

namespace Cabcon.WebApi.Authorization;

/// <summary>
/// Evaluates a PermissionRequirement against the "permission" claims embedded
/// in the caller's JWT (placed there by JwtTokenGenerator from the union of
/// every permission granted by every role the user holds). This is what makes
/// authorization PERMISSION-based rather than role-based: a controller action
/// declares [HasPermission(AppPermissions.Sku.Delete)], not
/// [Authorize(Roles = "Admin")] - so re-assigning which roles grant that
/// permission (via the Roles admin screen) changes who can delete SKUs without
/// ever touching code or redeploying.
/// </summary>
public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        var isSuperAdmin = context.User.HasClaim(System.Security.Claims.ClaimTypes.Role, "Super Admin");
        var hasPermission = context.User.Claims.Any(c => c.Type == "permission" && c.Value == requirement.Permission);

        if (isSuperAdmin || hasPermission)
            context.Succeed(requirement);

        return Task.CompletedTask;
    }
}
