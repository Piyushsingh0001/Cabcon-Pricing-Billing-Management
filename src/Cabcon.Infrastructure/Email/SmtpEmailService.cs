using System.Net;
using System.Net.Mail;
using Cabcon.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cabcon.Infrastructure.Email;

/// <summary>
/// SMTP-backed IEmailService. When EmailSettings.UseDevelopmentLogger is true
/// (the default, so a fresh clone "just works" without mail credentials), it
/// logs the rendered email instead of sending it - the verification/reset link
/// is fully visible in the console/Serilog sink for local testing. Swap the
/// implementation (e.g. to SendGrid) by registering a different IEmailService
/// in DependencyInjection.cs - no Application-layer code changes needed.
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<EmailSettings> settings, ILogger<SmtpEmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public Task SendEmailVerificationAsync(string toEmail, string userName, string verificationLink, CancellationToken ct = default) =>
        SendAsync(toEmail,
            "Confirm your Cabcon account",
            $"<p>Hi {userName},</p><p>Please confirm your email address by clicking the link below:</p>" +
            $"<p><a href=\"{verificationLink}\">Confirm Email</a></p><p>This link expires in 24 hours.</p>",
            ct);

    public Task SendPasswordResetAsync(string toEmail, string userName, string resetLink, CancellationToken ct = default) =>
        SendAsync(toEmail,
            "Reset your Cabcon password",
            $"<p>Hi {userName},</p><p>We received a request to reset your password. Click the link below to choose a new one:</p>" +
            $"<p><a href=\"{resetLink}\">Reset Password</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>",
            ct);

    private async Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct)
    {
        if (_settings.UseDevelopmentLogger)
        {
            _logger.LogInformation("[DEV EMAIL] To: {ToEmail} | Subject: {Subject} | Body: {Body}", toEmail, subject, htmlBody);
            return;
        }

        using var client = new SmtpClient(_settings.SmtpHost, _settings.SmtpPort)
        {
            EnableSsl = _settings.EnableSsl,
            Credentials = new NetworkCredential(_settings.SmtpUser, _settings.SmtpPassword)
        };

        using var message = new MailMessage
        {
            From = new MailAddress(_settings.FromAddress, _settings.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        message.To.Add(toEmail);

        await client.SendMailAsync(message, ct);
    }
}
