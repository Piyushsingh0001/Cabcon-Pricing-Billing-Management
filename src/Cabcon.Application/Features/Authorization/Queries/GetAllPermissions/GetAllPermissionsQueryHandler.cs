using Cabcon.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authorization.Queries.GetAllPermissions;

public class GetAllPermissionsQueryHandler : IRequestHandler<GetAllPermissionsQuery, IReadOnlyList<PermissionDto>>
{
    private readonly IApplicationDbContext _db;
    public GetAllPermissionsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<PermissionDto>> Handle(GetAllPermissionsQuery request, CancellationToken cancellationToken) =>
        await _db.Permissions
            .OrderBy(p => p.Module).ThenBy(p => p.Code)
            .Select(p => new PermissionDto(p.Id, p.Code, p.Module, p.Description))
            .ToListAsync(cancellationToken);
}
