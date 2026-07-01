using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Identity;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authorization.Commands.AssignRolesToUser;

public class AssignRolesToUserCommandHandler : IRequestHandler<AssignRolesToUserCommand, Result>
{
    private readonly IApplicationDbContext _db;
    public AssignRolesToUserCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<Result> Handle(AssignRolesToUserCommand request, CancellationToken cancellationToken)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null)
            return Result.Failure("User not found.");

        var validRoleIds = await _db.Roles
            .Where(r => request.RoleIds.Contains(r.Id))
            .Select(r => r.Id)
            .ToListAsync(cancellationToken);

        var toRemove = user.UserRoles.Where(ur => !validRoleIds.Contains(ur.RoleId)).ToList();
        foreach (var ur in toRemove)
            _db.UserRoles.Remove(ur);

        var existingIds = user.UserRoles.Select(ur => ur.RoleId).ToHashSet();
        foreach (var roleId in validRoleIds.Where(id => !existingIds.Contains(id)))
            _db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });

        user.SecurityStamp = Guid.NewGuid().ToString("N");

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
