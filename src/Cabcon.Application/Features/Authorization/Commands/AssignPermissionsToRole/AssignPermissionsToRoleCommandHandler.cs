using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Identity;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authorization.Commands.AssignPermissionsToRole;

public class AssignPermissionsToRoleCommandHandler : IRequestHandler<AssignPermissionsToRoleCommand, Result>
{
    private readonly IApplicationDbContext _db;
    public AssignPermissionsToRoleCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<Result> Handle(AssignPermissionsToRoleCommand request, CancellationToken cancellationToken)
    {
        var role = await _db.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == request.RoleId, cancellationToken);
        if (role is null)
            return Result.Failure("Role not found.");

        var validPermissionIds = await _db.Permissions
            .Where(p => request.PermissionIds.Contains(p.Id))
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);

        // Remove permissions no longer in the requested set.
        var toRemove = role.RolePermissions.Where(rp => !validPermissionIds.Contains(rp.PermissionId)).ToList();
        foreach (var rp in toRemove)
            _db.RolePermissions.Remove(rp);

        // Add newly-requested permissions not already linked.
        var existingIds = role.RolePermissions.Select(rp => rp.PermissionId).ToHashSet();
        foreach (var permissionId in validPermissionIds.Where(id => !existingIds.Contains(id)))
            _db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permissionId });

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
