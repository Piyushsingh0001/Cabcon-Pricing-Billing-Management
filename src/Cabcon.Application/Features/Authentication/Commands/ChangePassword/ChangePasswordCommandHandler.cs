using Cabcon.Application.Common.Interfaces;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authentication.Commands.ChangePassword;

/// <summary>
/// Verifies the current password, hashes and stores the new one, then rotates
/// SecurityStamp and revokes every refresh token (logging the user out
/// everywhere except the device that just changed the password, which will
/// receive a fresh token pair from the controller's response). This is the
/// standard enterprise behaviour: a password change is treated as a security
/// event that should invalidate any session started before it.
/// </summary>
public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, Result>
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IDateTime _dateTime;

    public ChangePasswordCommandHandler(IApplicationDbContext db, IPasswordHasher passwordHasher, IDateTime dateTime)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _dateTime = dateTime;
    }

    public async Task<Result> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null)
            return Result.Failure("User not found.");

        if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            return Result.Failure("Current password is incorrect.");

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        user.SecurityStamp = Guid.NewGuid().ToString("N");

        var now = _dateTime.UtcNow;
        var activeTokens = await _db.RefreshTokens
            .Where(rt => rt.UserId == user.Id && rt.RevokedUtc == null)
            .ToListAsync(cancellationToken);
        foreach (var token in activeTokens)
        {
            token.RevokedUtc = now;
            token.RevokedByIp = request.IpAddress;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
