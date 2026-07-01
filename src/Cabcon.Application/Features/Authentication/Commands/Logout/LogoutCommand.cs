using Cabcon.Shared.Wrappers;
using MediatR;

namespace Cabcon.Application.Features.Authentication.Commands.Logout;

/// <summary>Revokes a single refresh token (the one belonging to the device/
/// browser performing the logout) - other devices/sessions remain logged in.
/// For "log out everywhere" see RevokeToken/RevokeAllCommand.</summary>
public record LogoutCommand(int UserId, string? RawRefreshToken, string? IpAddress) : IRequest<Result>;
