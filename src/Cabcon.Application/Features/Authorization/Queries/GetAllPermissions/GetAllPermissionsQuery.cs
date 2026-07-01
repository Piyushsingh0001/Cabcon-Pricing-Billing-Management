using MediatR;

namespace Cabcon.Application.Features.Authorization.Queries.GetAllPermissions;

public record PermissionDto(int Id, string Code, string Module, string? Description);

/// <summary>Used by the Angular Admin > Permission Management screen to render
/// the master checklist of every permission in the system, grouped by Module.</summary>
public record GetAllPermissionsQuery : IRequest<IReadOnlyList<PermissionDto>>;
