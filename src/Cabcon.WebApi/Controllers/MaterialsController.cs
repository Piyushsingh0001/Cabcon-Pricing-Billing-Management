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
    public async Task<IActionResult> GetHistory(int id, [FromQuery] MaterialType? type, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetMaterialPriceHistoryQuery(id, type), ct);
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
        var result = await _mediator.Send(new UpdateMaterialCommand(id, request.Name, request.VendorName, request.Type), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }

    [HttpDelete("{id:int}")]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteMaterialCommand(id), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }

    [HttpPost("bulk-stamp")]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> BulkStamp(CancellationToken ct)
    {
        var result = await _mediator.Send(new BulkStampMaterialPricesCommand(), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
    }

    [HttpGet("monthly-average")]
    [HasPermission(AppPermissions.Pricing.View)]
    public async Task<IActionResult> GetMonthlyAverage([FromQuery] int month, [FromQuery] int year, CancellationToken ct)
    {
        var query = new Cabcon.Application.Features.Pricing.Materials.Queries.GetMonthlyAveragePrices.GetMonthlyAveragePricesQuery(month, year);
        var result = await _mediator.Send(query, ct);
        return Ok(result);
    }

    [HttpPost("{id:int}/backfill")]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> Backfill(int id, [FromBody] List<BackfillPriceDto> prices, CancellationToken ct)
    {
        var result = await _mediator.Send(new BackfillMaterialPricesCommand(id, prices), ct);
        return result.Succeeded ? Ok() : BadRequest(result.Errors);
    }

    [HttpGet("{id:int}/missing-dates")]
    [HasPermission(AppPermissions.Pricing.View)]
    public async Task<IActionResult> GetMissingDates(int id, [FromQuery] MaterialType? type, [FromQuery] string? vendorName, [FromQuery] int? vendorId, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetMaterialMissingDatesQuery(id, type, vendorName, vendorId), ct);
        return Ok(result);
    }
}

public record UpdateMaterialRequest(string Name, string? VendorName, MaterialType Type);

public record GetMaterialsRequest(
    string? Search = null,
    MaterialType? Type = null,
    string? SortBy = null,
    bool SortDesc = false,
    int PageNumber = 1,
    int PageSize = 10);
