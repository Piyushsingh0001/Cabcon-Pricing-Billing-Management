using Cabcon.Application.Features.Authorization.Queries.GetAllPermissions;
using Cabcon.Shared.Constants;
using Cabcon.WebApi.Authorization;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Cabcon.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[HasPermission(AppPermissions.Roles.View)]
public class PermissionsController : ControllerBase
{
    private readonly ISender _mediator;
    public PermissionsController(ISender mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PermissionDto>>> GetAll(CancellationToken ct) =>
        Ok(await _mediator.Send(new GetAllPermissionsQuery(), ct));
}
