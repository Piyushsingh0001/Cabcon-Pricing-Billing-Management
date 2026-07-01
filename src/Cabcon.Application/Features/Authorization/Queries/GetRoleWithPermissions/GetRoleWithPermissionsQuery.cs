using MediatR;

namespace Cabcon.Application.Features.Authorization.Queries.GetRoleWithPermissions;

public record RoleDetailDto(int Id, string Name, string? Description, IReadOnlyList<int> PermissionIds);

public record GetRoleWithPermissionsQuery(int RoleId) : IRequest<RoleDetailDto>;
