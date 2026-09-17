using Cabcon.Application.Features.Pricing.ItemConfiguration;
using Cabcon.Shared.Constants;
using Cabcon.WebApi.Authorization;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Cabcon.WebApi.Controllers;

[ApiController]
[Route("api/item-configuration")]
public class ItemConfigurationController : ControllerBase
{
    private readonly ISender _mediator;

    public ItemConfigurationController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("matrix")]
    [HasPermission(AppPermissions.Sku.View)]
    public async Task<IActionResult> GetMatrix(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetItemConfigurationMatrixQuery(), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
    }

    [HttpPost("matrix")]
    [HasPermission(AppPermissions.Sku.Update)]
    public async Task<IActionResult> SaveMatrix([FromBody] SaveItemConfigurationMatrixCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Succeeded ? Ok(result) : BadRequest(result.Errors);
    }
}
