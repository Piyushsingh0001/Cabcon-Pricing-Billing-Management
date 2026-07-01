using Cabcon.Shared.Wrappers;
using MediatR;

namespace Cabcon.Application.Features.Authentication.Commands.ChangePassword;

/// <summary>Self-service password change for an already-authenticated user
/// (requires the current password as proof-of-possession). UserId comes from
/// ICurrentUserService/JWT claims in the controller - never from the request body.</summary>
public record ChangePasswordCommand(int UserId, string CurrentPassword, string NewPassword, string? IpAddress)
    : IRequest<Result>;
