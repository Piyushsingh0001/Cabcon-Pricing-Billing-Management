using Cabcon.Application.Features.Pricing.MaterialTypes;
using Cabcon.Shared.Constants;
using Cabcon.WebApi.Authorization;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Cabcon.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaterialTypesController : ControllerBase
{
    private readonly ISender _mediator;

    public MaterialTypesController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(AppPermissions.Pricing.View)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetAllMaterialTypesQuery(), ct);
        return Ok(result.Data);
    }

    [HttpPost]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> Create([FromBody] CreateMaterialTypeRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new CreateMaterialTypeCommand(request.Name, request.Description), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
    }

    [HttpPut("{id:int}")]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMaterialTypeRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new UpdateMaterialTypeCommand(id, request.Name, request.Description, request.IsActive), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }

    [HttpDelete("{id:int}")]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteMaterialTypeCommand(id), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }
}

public record CreateMaterialTypeRequest(string Name, string? Description = null);
public record UpdateMaterialTypeRequest(string Name, string? Description = null, bool? IsActive = null);
