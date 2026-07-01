using Cabcon.Shared.Wrappers;
using MediatR;

namespace Cabcon.Application.Features.Authentication.Commands.Register;

/// <summary>
/// Creates a new local-auth user. RoleName defaults to "User" (least
/// privilege) if not supplied - only an Admin-authorized caller (enforced by
/// [HasPermission(Users.Create)] on the controller, see Part 5) may pass a
/// different role, e.g. to provision a Manager account directly.
/// </summary>
public record RegisterCommand(string FullName, string Email, string UserName, string Password, string RoleName, string ClientVerifyUrlBase)
    : IRequest<Result<int>>;
