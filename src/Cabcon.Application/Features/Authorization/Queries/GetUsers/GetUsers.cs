using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Identity;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authorization.Queries.GetUsers;

public record UserDto
{
    public int Id { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string UserName { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public DateTime? LastLoginDate { get; init; }
    public IReadOnlyList<string> Roles { get; init; } = Array.Empty<string>();
}

public record GetUsersQuery : IRequest<IReadOnlyList<UserDto>>;

public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, IReadOnlyList<UserDto>>
{
    private readonly IRepository<User> _repository;

    public GetUsersQueryHandler(IRepository<User> repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<UserDto>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
    {
        return await _repository.Query()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .OrderBy(u => u.FullName)
            .Select(u => new UserDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                UserName = u.UserName,
                IsActive = u.IsActive,
                LastLoginDate = u.LastLoginDate,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
            })
            .ToListAsync(cancellationToken);
    }
}
