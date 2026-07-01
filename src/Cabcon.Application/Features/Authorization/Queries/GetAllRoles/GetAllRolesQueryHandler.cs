using Cabcon.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authorization.Queries.GetAllRoles;

public class GetAllRolesQueryHandler : IRequestHandler<GetAllRolesQuery, IReadOnlyList<RoleSummaryDto>>
{
    private readonly IApplicationDbContext _db;
    public GetAllRolesQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<RoleSummaryDto>> Handle(GetAllRolesQuery request, CancellationToken cancellationToken) =>
        await _db.Roles
            .OrderBy(r => r.Name)
            .Select(r => new RoleSummaryDto(r.Id, r.Name, r.Description, r.RolePermissions.Count, r.UserRoles.Count))
            .ToListAsync(cancellationToken);
}
