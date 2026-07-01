using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Identity;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authentication.Commands.ForgotPassword;

/// <summary>
/// Issues a single-use, time-boxed (1 hour) password reset token and emails a
/// reset link. Always returns Result.Success() regardless of whether the email
/// matched a user - this is deliberate: returning a different result for
/// "unknown email" vs "email found" lets an attacker enumerate registered
/// emails, so the API surface is identical either way and only the inbox
/// (or lack of one) reveals the truth.
/// </summary>
public class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, Result>
{
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(1);

    private readonly IApplicationDbContext _db;
    private readonly IRefreshTokenGenerator _tokenGenerator; // reused: same secure-random + hash mechanism
    private readonly IEmailService _emailService;
    private readonly IDateTime _dateTime;

    public ForgotPasswordCommandHandler(
        IApplicationDbContext db, IRefreshTokenGenerator tokenGenerator, IEmailService emailService, IDateTime dateTime)
    {
        _db = db;
        _tokenGenerator = tokenGenerator;
        _emailService = emailService;
        _dateTime = dateTime;
    }

    public async Task<Result> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email, cancellationToken);

        if (user is not null && user.IsActive)
        {
            var (rawToken, hash) = _tokenGenerator.Generate();

            _db.PasswordResetTokens.Add(new PasswordResetToken
            {
                UserId = user.Id,
                TokenHash = hash,
                ExpiresUtc = _dateTime.UtcNow.Add(TokenLifetime)
            });
            await _db.SaveChangesAsync(cancellationToken);

            var resetLink = $"{request.ClientResetUrlBase.TrimEnd('/')}?token={Uri.EscapeDataString(rawToken)}&email={Uri.EscapeDataString(user.Email)}";
            await _emailService.SendPasswordResetAsync(user.Email, user.FullName, resetLink, cancellationToken);
        }

        return Result.Success();
    }
}
