using System.Security.Claims;
using Cabcon.Application.Common.Interfaces;

namespace Cabcon.WebApi.Services;

/// <summary>
/// Reads "who is making this request" from the validated JWT's ClaimsPrincipal
/// on HttpContext.User. Registered as Scoped (one instance per HTTP request).
/// Consumed by CabconDbContext (audit-column stamping), Application handlers
/// (e.g. ChangePassword takes UserId from here in the controller, never from
/// the request body), and PermissionAuthorizationHandler indirectly via the
/// "permission" claims already on the principal.
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor) => _httpContextAccessor = httpContextAccessor;

    private ClaimsPrincipal? Principal => _httpContextAccessor.HttpContext?.User;

    public int? UserId
    {
        get
        {
            var value = Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var id) ? id : null;
        }
    }

    public string? UserName => Principal?.FindFirstValue(ClaimTypes.Name);

    public string? IpAddress => _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

    public IReadOnlyCollection<string> Permissions =>
        Principal?.FindAll("permission").Select(c => c.Value).ToList() ?? new List<string>();

    public IReadOnlyCollection<string> Roles =>
        Principal?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList() ?? new List<string>();
}
