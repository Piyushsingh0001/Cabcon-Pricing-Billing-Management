using Cabcon.Application.Common.Models;
using MediatR;

namespace Cabcon.Application.Features.Authentication.Commands.RefreshToken;

public record RefreshTokenCommand(string RawRefreshToken, string? IpAddress) : IRequest<AuthResponseDto>;
