using Cabcon.Shared.Wrappers;
using MediatR;

namespace Cabcon.Application.Features.Authorization.Commands.AssignPermissionsToRole;

/// <summary>Replaces the role's entire permission set with PermissionIds (i.e.
/// the Angular "Manage Permissions" screen sends the full desired checklist
/// state, not a delta) - simpler client logic, and idempotent on retry.
/// System roles (Admin/Manager/User) can still have their permissions edited;
/// only role *deletion* is blocked for system roles (see DeleteRole, not shown
/// here as it falls under Part 6-style CRUD, not core auth).</summary>
public record AssignPermissionsToRoleCommand(int RoleId, IReadOnlyList<int> PermissionIds) : IRequest<Result>;
