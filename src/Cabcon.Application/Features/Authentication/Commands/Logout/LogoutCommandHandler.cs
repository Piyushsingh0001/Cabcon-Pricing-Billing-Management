using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Audit;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authentication.Commands.Logout;

public class LogoutCommandHandler : IRequestHandler<LogoutCommand, Result>
{
    private readonly IApplicationDbContext _db;
    private readonly IRefreshTokenGenerator _refreshTokenGenerator;
    private readonly IDateTime _dateTime;

    public LogoutCommandHandler(IApplicationDbContext db, IRefreshTokenGenerator refreshTokenGenerator, IDateTime dateTime)
    {
        _db = db;
        _refreshTokenGenerator = refreshTokenGenerator;
        _dateTime = dateTime;
    }

    public async Task<Result> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        var now = _dateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.RawRefreshToken))
        {
            var hash = _refreshTokenGenerator.Hash(request.RawRefreshToken);
            var token = await _db.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.TokenHash == hash && rt.UserId == request.UserId, cancellationToken);

            if (token is not null && token.RevokedUtc is null)
            {
                token.RevokedUtc = now;
                token.RevokedByIp = request.IpAddress;
            }
        }

        _db.LoginHistory.Add(new LoginHistory
        {
            UserId = request.UserId,
            UserNameAttempted = string.Empty,
            IsSuccessful = true,
            EventType = "Logout",
            IpAddress = request.IpAddress,
            EventTimestampUtc = now
        });

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
