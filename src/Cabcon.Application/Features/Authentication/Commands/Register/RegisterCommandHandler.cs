using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Identity;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Authentication.Commands.Register;

/// <summary>
/// Creates the User row (EmailConfirmed=false), assigns the requested role,
/// and issues + emails a 24-hour email-verification token. Password is hashed
/// before it ever reaches the database - the plaintext value exists only for
/// the duration of this request, in memory, never logged
/// (RequestResponseLoggingMiddleware redacts the "password" field - see Part 11).
/// </summary>
public class RegisterCommandHandler : IRequestHandler<RegisterCommand, Result<int>>
{
    private static readonly TimeSpan VerificationTokenLifetime = TimeSpan.FromHours(24);

    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IRefreshTokenGenerator _tokenGenerator;
    private readonly IEmailService _emailService;
    private readonly IDateTime _dateTime;

    public RegisterCommandHandler(
        IApplicationDbContext db, IPasswordHasher passwordHasher, IRefreshTokenGenerator tokenGenerator,
        IEmailService emailService, IDateTime dateTime)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenGenerator = tokenGenerator;
        _emailService = emailService;
        _dateTime = dateTime;
    }

    public async Task<Result<int>> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var emailLower = request.Email.Trim().ToLowerInvariant();
        var userNameLower = request.UserName.Trim().ToLowerInvariant();

        var exists = await _db.Users.AnyAsync(
            u => u.Email.ToLower() == emailLower || u.UserName.ToLower() == userNameLower, cancellationToken);
        if (exists)
            return Result<int>.Failure("A user with this email or username already exists.");

        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == request.RoleName, cancellationToken);
        if (role is null)
            return Result<int>.Failure($"Role '{request.RoleName}' does not exist.");

        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email,
            UserName = request.UserName,
            PasswordHash = _passwordHasher.Hash(request.Password),
            EmailConfirmed = false,
            IsActive = true
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken); // need user.Id for the role link + token FK

        _db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });

        var (rawToken, hash) = _tokenGenerator.Generate();
        _db.EmailVerificationTokens.Add(new EmailVerificationToken
        {
            UserId = user.Id,
            TokenHash = hash,
            ExpiresUtc = _dateTime.UtcNow.Add(VerificationTokenLifetime)
        });
        await _db.SaveChangesAsync(cancellationToken);

        var verifyLink = $"{request.ClientVerifyUrlBase.TrimEnd('/')}?token={Uri.EscapeDataString(rawToken)}&email={Uri.EscapeDataString(user.Email)}";
        await _emailService.SendEmailVerificationAsync(user.Email, user.FullName, verifyLink, cancellationToken);

        return Result<int>.Success(user.Id);
    }
}
