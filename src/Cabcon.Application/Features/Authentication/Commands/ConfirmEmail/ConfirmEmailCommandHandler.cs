using Cabcon.Application.Common.Interfaces;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authentication.Commands.ConfirmEmail;

public class ConfirmEmailCommandHandler : IRequestHandler<ConfirmEmailCommand, Result>
{
    private readonly IApplicationDbContext _db;
    private readonly IRefreshTokenGenerator _tokenGenerator;
    private readonly IDateTime _dateTime;

    public ConfirmEmailCommandHandler(IApplicationDbContext db, IRefreshTokenGenerator tokenGenerator, IDateTime dateTime)
    {
        _db = db;
        _tokenGenerator = tokenGenerator;
        _dateTime = dateTime;
    }

    public async Task<Result> Handle(ConfirmEmailCommand request, CancellationToken cancellationToken)
    {
        var now = _dateTime.UtcNow;
        var email = request.Email.Trim().ToLowerInvariant();
        var hash = _tokenGenerator.Hash(request.RawToken);

        var token = await _db.EmailVerificationTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash && t.User.Email.ToLower() == email, cancellationToken);

        if (token is null || token.UsedUtc is not null || now >= token.ExpiresUtc)
            return Result.Failure("This verification link is invalid or has expired.");

        token.User.EmailConfirmed = true;
        token.UsedUtc = now;

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
