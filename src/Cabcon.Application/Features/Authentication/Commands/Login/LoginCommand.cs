using Cabcon.Application.Common.Models;
using MediatR;

namespace Cabcon.Application.Features.Authentication.Commands.Login;

/// <summary>UserNameOrEmail accepts either to match the original HTML demo's
/// single "username" field while still allowing email-based login, common in
/// enterprise apps. IpAddress/UserAgent are populated by AuthController from
/// HttpContext, never trusted from the request body.</summary>
public record LoginCommand(string UserNameOrEmail, string Password, string? IpAddress, string? UserAgent)
    : IRequest<AuthResponseDto>;
