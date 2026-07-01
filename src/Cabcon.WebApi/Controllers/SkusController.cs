using Cabcon.Application.Features.Pricing.Skus;
using Cabcon.Shared.Constants;
using Cabcon.WebApi.Authorization;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Cabcon.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SkusController : ControllerBase
{
    private readonly ISender _mediator;

    public SkusController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(AppPermissions.Sku.View)]
    public async Task<IActionResult> Get([FromQuery] GetSkusRequest request, CancellationToken ct)
    {
        var query = new GetSkusQuery
        {
            Search = request.Search,
            CategoryId = request.CategoryId,
            SortBy = request.SortBy,
            SortDesc = request.SortDesc,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
        var result = await _mediator.Send(query, ct);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [HasPermission(AppPermissions.Sku.View)]
    public async Task<IActionResult> GetById(int id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetSkuDetailsQuery(id), ct);
        return Ok(result);
    }

    [HttpPost]
    [HasPermission(AppPermissions.Sku.Create)]
    public async Task<IActionResult> Create([FromBody] CreateSkuCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
    }

    [HttpPut("{id}")]
    [HasPermission(AppPermissions.Sku.Update)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSkuCommand command, CancellationToken ct)
    {
        if (id != command.Id)
        {
            return BadRequest("Sku ID mismatch.");
        }
        var result = await _mediator.Send(command, ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }

    [HttpDelete("{id}")]
    [HasPermission(AppPermissions.Sku.Delete)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteSkuCommand(id), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }
}

public record GetSkusRequest(
    string? Search = null,
    int? CategoryId = null,
    string? SortBy = null,
    bool SortDesc = false,
    int PageNumber = 1,
    int PageSize = 10);
