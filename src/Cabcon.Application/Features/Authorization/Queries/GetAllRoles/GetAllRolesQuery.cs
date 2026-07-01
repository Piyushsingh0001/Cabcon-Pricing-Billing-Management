using MediatR;

namespace Cabcon.Application.Features.Authorization.Queries.GetAllRoles;

public record RoleSummaryDto(int Id, string Name, string? Description, int PermissionCount, int UserCount);

public record GetAllRolesQuery : IRequest<IReadOnlyList<RoleSummaryDto>>;
