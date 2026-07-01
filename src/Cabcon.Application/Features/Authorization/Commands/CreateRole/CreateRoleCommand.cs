using Cabcon.Shared.Wrappers;
using MediatR;

namespace Cabcon.Application.Features.Authorization.Commands.CreateRole;

public record CreateRoleCommand(string Name, string? Description) : IRequest<Result<int>>;
