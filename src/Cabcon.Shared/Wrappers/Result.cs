namespace Cabcon.Shared.Wrappers;

/// <summary>
/// Non-generic operation result. Used by command handlers that don't return data
/// (Logout, RevokeToken, ChangePassword, AssignPermissions...). Lets controllers
/// translate a failure into the correct HTTP status without throwing for
/// expected/business-level failures (wrong password, token already revoked, etc).
/// Exceptions are reserved for *unexpected* failures (see Exceptions/*.cs).
/// </summary>
public class Result
{
    public bool Succeeded { get; protected set; }
    public string[] Errors { get; protected set; } = Array.Empty<string>();

    public static Result Success() => new() { Succeeded = true };

    public static Result Failure(params string[] errors) =>
        new() { Succeeded = false, Errors = errors };
}

/// <summary>Generic operation result that also carries a payload on success.</summary>
public class Result<T> : Result
{
    public T? Data { get; private set; }

    public static Result<T> Success(T data) =>
        new() { Succeeded = true, Data = data };

    public new static Result<T> Failure(params string[] errors) =>
        new() { Succeeded = false, Errors = errors };
}
