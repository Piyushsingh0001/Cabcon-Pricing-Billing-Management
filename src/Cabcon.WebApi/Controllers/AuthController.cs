using Cabcon.Application.Common.Interfaces;
using Cabcon.Application.Features.Authentication.Commands.ChangePassword;
using Cabcon.Application.Features.Authentication.Commands.ConfirmEmail;
using Cabcon.Application.Features.Authentication.Commands.ForgotPassword;
using Cabcon.Application.Features.Authentication.Commands.Login;
using Cabcon.Application.Features.Authentication.Commands.Logout;
using Cabcon.Application.Features.Authentication.Commands.RefreshToken;
using Cabcon.Application.Features.Authentication.Commands.Register;
using Cabcon.Application.Features.Authentication.Commands.ResetPassword;
using Cabcon.Application.Features.Authentication.Commands.RevokeAllTokens;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cabcon.WebApi.Controllers;

/// <summary>
/// All anonymous-accessible authentication endpoints, plus the authenticated
/// "manage my own session" endpoints (Logout, ChangePassword, RevokeAll).
/// The refresh token is returned to the client in the response body (the SPA
/// stores it - see Part 9 Angular AuthService) rather than as a cookie, to keep
/// the API stateless/CORS-simple for this reference implementation; switching
/// to an HttpOnly cookie is a drop-in change isolated to this controller.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ISender _mediator;
    private readonly ICurrentUserService _currentUser;

    public AuthController(ISender mediator, ICurrentUserService currentUser)
    {
        _mediator = mediator;
        _currentUser = currentUser;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new LoginCommand(
            request.UserNameOrEmail, request.Password, GetIp(), Request.Headers.UserAgent.ToString()), ct);
        return Ok(result);
    }

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh(RefreshRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new RefreshTokenCommand(request.RefreshToken, GetIp()), ct);
        return Ok(result);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new LogoutCommand(_currentUser.UserId!.Value, request.RefreshToken, GetIp()), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }

    [HttpPost("revoke-all")]
    [Authorize]
    public async Task<IActionResult> RevokeAll(CancellationToken ct)
    {
        var result = await _mediator.Send(new RevokeAllTokensCommand(_currentUser.UserId!.Value, GetIp()), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new ChangePasswordCommand(
            _currentUser.UserId!.Value, request.CurrentPassword, request.NewPassword, GetIp()), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken ct)
    {
        // ClientResetUrlBase points at the Angular route that hosts the "set new
        // password" form, e.g. https://app.cabcon.com/reset-password
        await _mediator.Send(new ForgotPasswordCommand(request.Email, request.ClientResetUrlBase), ct);
        return Ok(new { message = "If that email is registered, a password reset link has been sent." });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new ResetPasswordCommand(request.Email, request.Token, request.NewPassword, GetIp()), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new RegisterCommand(
            request.FullName, request.Email, request.UserName, request.Password,
            request.RoleName ?? "User", request.ClientVerifyUrlBase), ct);
        return result.Succeeded ? Ok(new { userId = result.Data }) : BadRequest(result.Errors);
    }

    [HttpPost("confirm-email")]
    [AllowAnonymous]
    public async Task<IActionResult> ConfirmEmail(ConfirmEmailRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new ConfirmEmailCommand(request.Email, request.Token), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me() => Ok(new
    {
        userId = _currentUser.UserId,
        userName = _currentUser.UserName,
        permissions = _currentUser.Permissions
    });

    private string? GetIp() => _currentUser.IpAddress ?? HttpContext.Connection.RemoteIpAddress?.ToString();
}

public record LoginRequest(string UserNameOrEmail, string Password);
public record RefreshRequest(string RefreshToken);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record ForgotPasswordRequest(string Email, string ClientResetUrlBase);
public record ResetPasswordRequest(string Email, string Token, string NewPassword);
public record RegisterRequest(string FullName, string Email, string UserName, string Password, string? RoleName, string ClientVerifyUrlBase);
public record ConfirmEmailRequest(string Email, string Token);
