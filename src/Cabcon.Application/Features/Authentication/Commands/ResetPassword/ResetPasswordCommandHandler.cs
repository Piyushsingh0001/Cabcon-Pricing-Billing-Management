using Cabcon.Application.Common.Interfaces;
using Cabcon.Shared.Exceptions;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authentication.Commands.ResetPassword;

/// <summary>
/// Consumes the token issued by ForgotPassword. The token is looked up by hash
/// (never by raw value), must belong to the supplied email's user, be unused,
/// and be within its expiry window. On success: set the new password hash,
/// rotate SecurityStamp, mark the token used (single-use enforced), and revoke
/// every existing refresh token - a password reset is, security-wise, no
/// different from a confirmed account compromise response.
/// </summary>
public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, Result>
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IRefreshTokenGenerator _tokenGenerator;
    private readonly IDateTime _dateTime;

    public ResetPasswordCommandHandler(
        IApplicationDbContext db, IPasswordHasher passwordHasher, IRefreshTokenGenerator tokenGenerator, IDateTime dateTime)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenGenerator = tokenGenerator;
        _dateTime = dateTime;
    }

    public async Task<Result> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var now = _dateTime.UtcNow;
        var email = request.Email.Trim().ToLowerInvariant();
        var hash = _tokenGenerator.Hash(request.RawToken);

        var token = await _db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash && t.User.Email.ToLower() == email, cancellationToken);

        if (token is null || token.UsedUtc is not null || now >= token.ExpiresUtc)
            throw new AuthenticationFailedException("This password reset link is invalid or has expired. Please request a new one.");

        var user = token.User;
        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.AccessFailedCount = 0;
        user.IsLockedOut = false;
        user.LockoutEndUtc = null;

        token.UsedUtc = now;

        var activeRefreshTokens = await _db.RefreshTokens
            .Where(rt => rt.UserId == user.Id && rt.RevokedUtc == null)
            .ToListAsync(cancellationToken);
        foreach (var rt in activeRefreshTokens)
        {
            rt.RevokedUtc = now;
            rt.RevokedByIp = request.IpAddress;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
