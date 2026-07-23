namespace Cabcon.Shared.Constants;

/// <summary>
/// Canonical permission codes, grouped by module ("Module.Action" convention).
/// These are the strings stored in Permission.Code, embedded as "permission" claims
/// in the JWT, and referenced by [HasPermission("...")] on controller actions.
/// Centralising them here (rather than magic strings scattered around) means a
/// typo becomes a compile error in any C# code that references this class.
/// </summary>
public static class AppPermissions
{
    public static class Users
    {
        public const string View = "Users.View";
        public const string Create = "Users.Create";
        public const string Update = "Users.Update";
        public const string Delete = "Users.Delete";
        public const string ManageRoles = "Users.ManageRoles";
    }

    public static class Roles
    {
        public const string View = "Roles.View";
        public const string Create = "Roles.Create";
        public const string Update = "Roles.Update";
        public const string Delete = "Roles.Delete";
        public const string ManagePermissions = "Roles.ManagePermissions";
    }

    public static class Pricing
    {
        public const string View = "Pricing.View";
        public const string Update = "Pricing.Update";
    }

    public static class Sku
    {
        public const string View = "Sku.View";
        public const string Create = "Sku.Create";
        public const string Update = "Sku.Update";
        public const string Delete = "Sku.Delete";
    }

    public static class Quotation
    {
        public const string View = "Quotation.View";
        public const string Generate = "Quotation.Generate";
        public const string Modify = "Quotation.Modify";
        public const string State = "Quotation.State";
    }

    public static class Settings
    {
        public const string View = "Settings.View";
        public const string Update = "Settings.Update";
    }

    /// <summary>All permission codes - used by the Persistence seed to populate
    /// the Permissions table and to wire the Admin role to every permission.</summary>
    public static IEnumerable<string> All()
    {
        foreach (var field in typeof(AppPermissions).GetNestedTypes()
                     .SelectMany(t => t.GetFields()))
        {
            if (field.GetValue(null) is string code)
                yield return code;
        }
    }
}
