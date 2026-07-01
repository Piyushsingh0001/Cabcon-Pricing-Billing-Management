using Cabcon.Shared.Wrappers;
using MediatR;

namespace Cabcon.Application.Features.Authorization.Commands.AssignRolesToUser;

/// <summary>Replaces a user's entire role set with RoleIds. Forces a
/// SecurityStamp rotation so the role change takes effect immediately on the
/// user's next request rather than waiting up to AccessTokenExpiryMinutes for
/// their current JWT to naturally expire (their old token's embedded "role"
/// claims would otherwise still be honoured until then).</summary>
public record AssignRolesToUserCommand(int UserId, IReadOnlyList<int> RoleIds) : IRequest<Result>;
