using Cabcon.Application.Common.Interfaces;
using Cabcon.Application.Common.Models;
using Cabcon.Domain.Entities.Audit;
using Cabcon.Domain.Entities.Identity;
using Cabcon.Shared.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authentication.Commands.Login;

/// <summary>
/// Authentication lifecycle entry point. Sequence:
///  1. Look up the user by username OR email (case-insensitive).
///  2. If not found -> log a failed LoginHistory row and throw a *generic*
///     AuthenticationFailedException - the message never reveals whether the
///     username existed, to prevent user-enumeration attacks.
///  3. If found but currently locked out (AccessFailedCount threshold reached
///     within the lockout window) -> reject without even checking the password.
///  4. Verify the password hash. On failure, increment AccessFailedCount and -
///     once it reaches the threshold - set IsLockedOut + LockoutEndUtc (Account
///     Lock / Failed Login Count requirement).
///  5. On success: reset the failure counter, stamp LastLoginDate, issue a new
///     JWT access token (embeds roles + permissions as claims) and a new opaque
///     refresh token (persisted hashed), and write a successful LoginHistory row.
/// </summary>
public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponseDto>
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IRefreshTokenGenerator _refreshTokenGenerator;
    private readonly IDateTime _dateTime;

    public LoginCommandHandler(
        IApplicationDbContext db,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        IRefreshTokenGenerator refreshTokenGenerator,
        IDateTime dateTime)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _refreshTokenGenerator = refreshTokenGenerator;
        _dateTime = dateTime;
    }

    public async Task<AuthResponseDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var now = _dateTime.UtcNow;
        var identifier = request.UserNameOrEmail.Trim().ToLowerInvariant();

        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.UserName.ToLower() == identifier || u.Email.ToLower() == identifier, cancellationToken);

        if (user is null)
        {
            await LogAttemptAsync(null, request, success: false, reason: "NotFound", now, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
            throw new AuthenticationFailedException("Invalid username or password.");
        }

        // Auto-unlock once the lockout window has elapsed.
        if (user.IsLockedOut && user.LockoutEndUtc is not null && user.LockoutEndUtc <= now)
        {
            user.IsLockedOut = false;
            user.AccessFailedCount = 0;
            user.LockoutEndUtc = null;
        }        

        if (user.IsLockedOut)
        {
            await LogAttemptAsync(user.Id, request, success: false, reason: "LockedOut", now, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
            throw new AuthenticationFailedException("Account is locked due to repeated failed login attempts. Try again later.");
        }

        if (!user.IsActive)
        {
            await LogAttemptAsync(user.Id, request, success: false, reason: "Inactive", now, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
            throw new AuthenticationFailedException("This account has been deactivated. Contact an administrator.");
        }

        if (!_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            user.AccessFailedCount++;
            if (user.AccessFailedCount >= MaxFailedAttempts)
            {
                user.IsLockedOut = true;
                user.LockoutEndUtc = now.Add(LockoutDuration);
            }
            await LogAttemptAsync(user.Id, request, success: false, reason: "InvalidPassword", now, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
            throw new AuthenticationFailedException("Invalid username or password.");
        }

        // ---- Success path ----
        user.AccessFailedCount = 0;
        user.LastLoginDate = now;

        var roles = user.UserRoles.Select(ur => ur.Role.Name).Distinct().ToList();
        var permissions = user.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Code))
            .Distinct()
            .ToList();

        var (accessToken, accessExpiry) = _jwtTokenGenerator.GenerateAccessToken(user, roles, permissions);
        var (rawRefreshToken, refreshHash) = _refreshTokenGenerator.Generate();

        var refreshExpiry = now.Add(_refreshTokenGenerator.Lifetime);
        _db.RefreshTokens.Add(new Cabcon.Domain.Entities.Identity.RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresUtc = refreshExpiry,
            CreatedByIp = request.IpAddress
        });

        await LogAttemptAsync(user.Id, request, success: true, reason: null, now, cancellationToken);
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

    private Task LogAttemptAsync(int? userId, LoginCommand request, bool success, string? reason, DateTime now, CancellationToken ct)
    {
        _db.LoginHistory.Add(new LoginHistory
        {
            UserId = userId,
            UserNameAttempted = request.UserNameOrEmail,
            IsSuccessful = success,
            FailureReason = reason,
            EventType = "Login",
            IpAddress = request.IpAddress,
            UserAgent = request.UserAgent,
            EventTimestampUtc = now
        });
        // Not saved here individually - caller controls the SaveChanges boundary
        // so a single transaction covers both the audit row and the entity update.
        return Task.CompletedTask;
    }
}
