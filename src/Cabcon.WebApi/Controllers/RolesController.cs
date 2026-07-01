using Cabcon.Application.Features.Authorization.Commands.AssignPermissionsToRole;
using Cabcon.Application.Features.Authorization.Commands.AssignRolesToUser;
using Cabcon.Application.Features.Authorization.Commands.CreateRole;
using Cabcon.Application.Features.Authorization.Queries.GetAllRoles;
using Cabcon.Application.Features.Authorization.Queries.GetRoleWithPermissions;
using Cabcon.Shared.Constants;
using Cabcon.WebApi.Authorization;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Cabcon.WebApi.Controllers;

/// <summary>Admin > Roles & Permissions screen backing API (Part 5).</summary>
[ApiController]
[Route("api/[controller]")]
[HasPermission(AppPermissions.Roles.View)]
public class RolesController : ControllerBase
{
    private readonly ISender _mediator;
    public RolesController(ISender mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoleSummaryDto>>> GetAll(CancellationToken ct) =>
        Ok(await _mediator.Send(new GetAllRolesQuery(), ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RoleDetailDto>> GetById(int id, CancellationToken ct) =>
        Ok(await _mediator.Send(new GetRoleWithPermissionsQuery(id), ct));

    [HttpPost]
    [HasPermission(AppPermissions.Roles.Create)]
    public async Task<IActionResult> Create(CreateRoleRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new CreateRoleCommand(request.Name, request.Description), ct);
        return result.Succeeded ? Ok(new { roleId = result.Data }) : BadRequest(result.Errors);
    }

    [HttpPut("{id:int}/permissions")]
    [HasPermission(AppPermissions.Roles.ManagePermissions)]
    public async Task<IActionResult> AssignPermissions(int id, AssignPermissionsRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new AssignPermissionsToRoleCommand(id, request.PermissionIds), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }

    [HttpPut("users/{userId:int}/roles")]
    [HasPermission(AppPermissions.Users.ManageRoles)]
    public async Task<IActionResult> AssignRolesToUser(int userId, AssignRolesRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new AssignRolesToUserCommand(userId, request.RoleIds), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }
}

public record CreateRoleRequest(string Name, string? Description);
public record AssignPermissionsRequest(IReadOnlyList<int> PermissionIds);
public record AssignRolesRequest(IReadOnlyList<int> RoleIds);
