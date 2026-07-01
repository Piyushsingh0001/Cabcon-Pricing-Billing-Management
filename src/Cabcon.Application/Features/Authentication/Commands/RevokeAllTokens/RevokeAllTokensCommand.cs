using Cabcon.Shared.Wrappers;
using MediatR;

namespace Cabcon.Application.Features.Authentication.Commands.RevokeAllTokens;

/// <summary>"Log out everywhere" - revokes every active refresh token for the
/// user AND rotates SecurityStamp, which immediately invalidates every
/// already-issued (but not yet expired) JWT access token too, because the JWT
/// validation pipeline checks the embedded security-stamp claim against the
/// user's current value on every request (see JwtBearerEvents in Part 4
/// WebApi wiring). Used after a suspected compromise, or explicitly by the user
/// from "Security" settings, and is also called internally by ChangePassword.</summary>
public record RevokeAllTokensCommand(int UserId, string? IpAddress) : IRequest<Result>;
