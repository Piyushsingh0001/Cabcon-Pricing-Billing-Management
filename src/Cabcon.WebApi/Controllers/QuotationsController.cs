using Cabcon.Application.Features.Pricing.Quotations;
using Cabcon.Shared.Constants;
using Cabcon.WebApi.Authorization;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Cabcon.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuotationsController : ControllerBase
{
    private readonly ISender _mediator;

    public QuotationsController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("calculate")]
    [HasPermission(AppPermissions.Quotation.Generate)]
    public async Task<IActionResult> Calculate([FromBody] CalculateQuotationCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return Ok(result);
    }

    [HttpPost]
    [HasPermission(AppPermissions.Quotation.Generate)]
    public async Task<IActionResult> Save([FromBody] SaveQuotationCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Succeeded ? Ok(new { quotationNumber = result.Data }) : BadRequest(result.Errors);
    }

    [HttpGet]
    [HasPermission(AppPermissions.Quotation.View)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetQuotationsQuery(), ct);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [HasPermission(AppPermissions.Quotation.View)]
    public async Task<IActionResult> GetById(int id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetQuotationDetailsQuery(id), ct);
        return Ok(result);
    }
}
