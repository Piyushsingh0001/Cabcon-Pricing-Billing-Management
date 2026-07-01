using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Identity;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authorization.Commands.CreateRole;

public class CreateRoleCommandHandler : IRequestHandler<CreateRoleCommand, Result<int>>
{
    private readonly IApplicationDbContext _db;
    public CreateRoleCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<Result<int>> Handle(CreateRoleCommand request, CancellationToken cancellationToken)
    {
        if (await _db.Roles.AnyAsync(r => r.Name == request.Name, cancellationToken))
            return Result<int>.Failure($"Role '{request.Name}' already exists.");

        var role = new Role { Name = request.Name, Description = request.Description };
        _db.Roles.Add(role);
        await _db.SaveChangesAsync(cancellationToken);

        return Result<int>.Success(role.Id);
    }
}
