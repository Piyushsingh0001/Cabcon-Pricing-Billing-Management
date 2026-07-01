using Cabcon.Application.Features.Pricing.Materials;
using Cabcon.Domain.Enums;
using Cabcon.Shared.Constants;
using Cabcon.WebApi.Authorization;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Cabcon.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaterialsController : ControllerBase
{
    private readonly ISender _mediator;

    public MaterialsController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(AppPermissions.Pricing.View)]
    public async Task<IActionResult> Get([FromQuery] GetMaterialsRequest request, CancellationToken ct)
    {
        var query = new GetMaterialsQuery
        {
            Search = request.Search,
            Type = request.Type,
            SortBy = request.SortBy,
            SortDesc = request.SortDesc,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
        
        var result = await _mediator.Send(query, ct);
        return Ok(result);
    }

    [HttpGet("{id}/history")]
    [HasPermission(AppPermissions.Pricing.View)]
    public async Task<IActionResult> GetHistory(int id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetMaterialPriceHistoryQuery(id), ct);
        return Ok(result);
    }

    [HttpPut("price")]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> UpdatePrice([FromBody] UpdateMaterialPriceCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }

    [HttpPost]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> Create([FromBody] CreateMaterialCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
    }

    [HttpPut("{id:int}")]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMaterialRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new UpdateMaterialCommand(id, request.Name, request.Type), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }

    [HttpDelete("{id:int}")]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteMaterialCommand(id), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }
}

public record UpdateMaterialRequest(string Name, MaterialType Type);

public record GetMaterialsRequest(
    string? Search = null,
    MaterialType? Type = null,
    string? SortBy = null,
    bool SortDesc = false,
    int PageNumber = 1,
    int PageSize = 10);
