using Cabcon.Application.Common.Interfaces;
using Cabcon.Shared.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authorization.Queries.GetRoleWithPermissions;

public class GetRoleWithPermissionsQueryHandler : IRequestHandler<GetRoleWithPermissionsQuery, RoleDetailDto>
{
    private readonly IApplicationDbContext _db;
    public GetRoleWithPermissionsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<RoleDetailDto> Handle(GetRoleWithPermissionsQuery request, CancellationToken cancellationToken)
    {
        var role = await _db.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == request.RoleId, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.Identity.Role), request.RoleId);

        return new RoleDetailDto(role.Id, role.Name, role.Description, role.RolePermissions.Select(rp => rp.PermissionId).ToList());
    }
}
