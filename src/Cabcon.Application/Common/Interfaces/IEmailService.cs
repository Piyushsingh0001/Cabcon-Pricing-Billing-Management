namespace Cabcon.Application.Common.Interfaces;

/// <summary>Outbound transactional email abstraction (SMTP implementation lives
/// in Cabcon.Infrastructure). Used for email verification links and password
/// reset links - kept generic so the implementation can later swap to
/// SendGrid/SES without changing any Application handler.</summary>
public interface IEmailService
{
    Task SendEmailVerificationAsync(string toEmail, string userName, string verificationLink, CancellationToken ct = default);

    Task SendPasswordResetAsync(string toEmail, string userName, string resetLink, CancellationToken ct = default);
}
