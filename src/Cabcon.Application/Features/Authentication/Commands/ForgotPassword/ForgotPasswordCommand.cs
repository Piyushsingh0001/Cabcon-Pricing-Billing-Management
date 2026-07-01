using Cabcon.Shared.Wrappers;
using MediatR;

namespace Cabcon.Application.Features.Authentication.Commands.ForgotPassword;

public record ForgotPasswordCommand(string Email, string ClientResetUrlBase) : IRequest<Result>;
