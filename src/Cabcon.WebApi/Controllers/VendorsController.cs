using Cabcon.Application.Features.Vendors;
using Cabcon.Shared.Constants;
using Cabcon.WebApi.Authorization;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Cabcon.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VendorsController : ControllerBase
{
    private readonly ISender _mediator;

    public VendorsController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(AppPermissions.Pricing.View)]
    public async Task<IActionResult> GetVendors(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetVendorsQuery(), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
    }

    [HttpPost]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> CreateVendor([FromBody] CreateVendorCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
    }

    [HttpDelete("{id}")]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> DeleteVendor(int id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteVendorCommand(id), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
    }

    [HttpGet("material-mappings")]
    [HasPermission(AppPermissions.Pricing.View)]
    public async Task<IActionResult> GetMaterialMappings(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetVendorMaterialMappingsQuery(), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
    }

    [HttpPost("material-mappings")]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> SaveMaterialMappings([FromBody] SaveVendorMaterialMappingsCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
    }
}
