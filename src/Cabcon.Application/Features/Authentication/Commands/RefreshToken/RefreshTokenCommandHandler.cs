using Cabcon.Application.Common.Interfaces;
using Cabcon.Application.Common.Models;
using Cabcon.Shared.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authentication.Commands.RefreshToken;

/// <summary>
/// Refresh Token Flow (rotation + reuse detection):
///  1. Hash the raw token presented by the client and look it up by hash (the
///     raw value is never stored, so a DB read alone can't yield a usable token).
///  2. Not found -> reject (could be forged / fabricated).
///  3. Found but already revoked -> this is a REUSE of a token that was already
///     rotated away, which is the classic signal of a stolen refresh token being
///     replayed. Response: revoke every active refresh token for that user
///     (kill all sessions) and reject - forces the legitimate user to log in
///     again everywhere, containing the breach.
///  4. Found but expired (not revoked, just timed out) -> reject normally.
///  5. Valid: revoke the presented token (ReplacedByTokenHash links it to its
///     successor for audit purposes), issue a brand new access+refresh token
///     pair. The old refresh token can never be used again even if intercepted
///     in transit after this point - this is "refresh token rotation".
/// </summary>
public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _db;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IRefreshTokenGenerator _refreshTokenGenerator;
    private readonly IDateTime _dateTime;

    public RefreshTokenCommandHandler(
        IApplicationDbContext db,
        IJwtTokenGenerator jwtTokenGenerator,
        IRefreshTokenGenerator refreshTokenGenerator,
        IDateTime dateTime)
    {
        _db = db;
        _jwtTokenGenerator = jwtTokenGenerator;
        _refreshTokenGenerator = refreshTokenGenerator;
        _dateTime = dateTime;
    }

    public async Task<AuthResponseDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var now = _dateTime.UtcNow;
        var hash = _refreshTokenGenerator.Hash(request.RawRefreshToken);

        var existing = await _db.RefreshTokens
            .Include(rt => rt.User).ThenInclude(u => u.UserRoles).ThenInclude(ur => ur.Role).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(rt => rt.TokenHash == hash, cancellationToken);

        if (existing is null)
            throw new AuthenticationFailedException("Invalid refresh token.");

        if (existing.RevokedUtc is not null)
        {
            // Reuse-detection: revoke every other active token for this user.
            var allActive = await _db.RefreshTokens
                .Where(rt => rt.UserId == existing.UserId && rt.RevokedUtc == null)
                .ToListAsync(cancellationToken);

            foreach (var token in allActive)
            {
                token.RevokedUtc = now;
                token.RevokedByIp = request.IpAddress;
            }
            await _db.SaveChangesAsync(cancellationToken);
            throw new AuthenticationFailedException("Refresh token has already been used. All sessions have been revoked for security - please log in again.");
        }

        if (now >= existing.ExpiresUtc)
            throw new AuthenticationFailedException("Refresh token has expired. Please log in again.");

        var user = existing.User;
        if (!user.IsActive || user.IsLockedOut)
            throw new AuthenticationFailedException("This account is no longer able to authenticate.");

        var roles = user.UserRoles.Select(ur => ur.Role.Name).Distinct().ToList();
        var permissions = user.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Code))
            .Distinct()
            .ToList();

        var (accessToken, accessExpiry) = _jwtTokenGenerator.GenerateAccessToken(user, roles, permissions);
        var (rawRefreshToken, refreshHash) = _refreshTokenGenerator.Generate();
        var refreshExpiry = now.Add(_refreshTokenGenerator.Lifetime);

        var replacement = new Domain.Entities.Identity.RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresUtc = refreshExpiry,
            CreatedByIp = request.IpAddress
        };
        _db.RefreshTokens.Add(replacement);

        existing.RevokedUtc = now;
        existing.RevokedByIp = request.IpAddress;
        existing.ReplacedByTokenHash = refreshHash;

        await _db.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto
        {
            UserId = user.Id,
            UserName = user.UserName,
            FullName = user.FullName,
            Email = user.Email,
            AccessToken = accessToken,
            AccessTokenExpiresUtc = accessExpiry,
            RefreshToken = rawRefreshToken,
            RefreshTokenExpiresUtc = refreshExpiry,
            Roles = roles,
            Permissions = permissions
        };
    }
}
