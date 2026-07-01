using Cabcon.Shared.Wrappers;
using MediatR;

namespace Cabcon.Application.Features.Authentication.Commands.ResetPassword;

public record ResetPasswordCommand(string Email, string RawToken, string NewPassword, string? IpAddress) : IRequest<Result>;
