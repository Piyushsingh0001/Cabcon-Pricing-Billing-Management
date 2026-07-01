namespace Cabcon.Infrastructure.Email;

/// <summary>Bound from appsettings.json "EmailSettings" via the Options Pattern.
/// In local/dev environments, set UseDevelopmentLogger=true to skip a real SMTP
/// call and just write the email content (including the verification/reset
/// link) to the log instead - convenient for testing without a mail server.</summary>
public class EmailSettings
{
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public string SmtpUser { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public bool EnableSsl { get; set; } = true;
    public string FromAddress { get; set; } = "no-reply@cabcon.local";
    public string FromName { get; set; } = "Cabcon Pricing & Billing";
    public bool UseDevelopmentLogger { get; set; } = true;
}
