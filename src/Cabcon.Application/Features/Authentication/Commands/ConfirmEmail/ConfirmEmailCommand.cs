using Cabcon.Shared.Wrappers;
using MediatR;

namespace Cabcon.Application.Features.Authentication.Commands.ConfirmEmail;

public record ConfirmEmailCommand(string Email, string RawToken) : IRequest<Result>;
