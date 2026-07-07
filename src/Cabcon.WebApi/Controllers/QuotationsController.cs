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
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
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

    [HttpGet("{id}/pdf")]
    [HasPermission(AppPermissions.Quotation.View)]
    public async Task<IActionResult> DownloadPdf(int id, CancellationToken ct)
    {
        var pdfBytes = await _mediator.Send(new GenerateQuotationPdfQuery(id), ct);
        return File(pdfBytes, "application/pdf", $"Quotation_{id}.pdf");
    }

    [HttpGet("pending-count")]
    [HasPermission(AppPermissions.Quotation.Generate)] // Or another permission, like SuperAdmin
    public async Task<IActionResult> GetPendingCount(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetPendingApprovalsCountQuery(), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
    }

    [HttpPost("{id}/approve")]
    [HasPermission(AppPermissions.Quotation.Generate)] // We can enforce super admin role in the future or through policy
    public async Task<IActionResult> ApproveQuotation(int id, [FromBody] Cabcon.Domain.Enums.ApprovalStatus status, CancellationToken ct)
    {
        var result = await _mediator.Send(new ApproveQuotationCommand(id, status), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
    }
}
