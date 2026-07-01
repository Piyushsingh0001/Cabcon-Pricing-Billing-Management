using Cabcon.Application.Common.Interfaces;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authentication.Commands.RevokeAllTokens;

public class RevokeAllTokensCommandHandler : IRequestHandler<RevokeAllTokensCommand, Result>
{
    private readonly IApplicationDbContext _db;
    private readonly IDateTime _dateTime;

    public RevokeAllTokensCommandHandler(IApplicationDbContext db, IDateTime dateTime)
    {
        _db = db;
        _dateTime = dateTime;
    }

    public async Task<Result> Handle(RevokeAllTokensCommand request, CancellationToken cancellationToken)
    {
        var now = _dateTime.UtcNow;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null)
            return Result.Failure("User not found.");

        var activeTokens = await _db.RefreshTokens
            .Where(rt => rt.UserId == request.UserId && rt.RevokedUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var token in activeTokens)
        {
            token.RevokedUtc = now;
            token.RevokedByIp = request.IpAddress;
        }

        // Rotating the stamp invalidates already-issued access tokens immediately,
        // since the JWT's "securityStamp" claim will no longer match.
        user.SecurityStamp = Guid.NewGuid().ToString("N");

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
