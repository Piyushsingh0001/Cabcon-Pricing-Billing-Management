namespace Cabcon.Shared.Constants;

/// <summary>Seeded, system-protected roles (cannot be deleted via the Roles API).
/// Additional custom roles can still be created at runtime - these three just
/// guarantee the app is usable out of the box.</summary>
public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string User = "User";

    public static readonly string[] SystemRoles = { Admin, Manager, User };
}
