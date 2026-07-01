using Cabcon.Application.Features.Pricing.Categories;
using Cabcon.Shared.Constants;
using Cabcon.WebApi.Authorization;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Cabcon.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ISender _mediator;

    public CategoriesController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(AppPermissions.Pricing.View)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetAllCategoriesQuery(), ct);
        return Ok(result);
    }

    [HttpPost]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new CreateCategoryCommand(request.Name), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(result.Errors);
    }

    [HttpPut("{id}")]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new UpdateCategoryCommand(id, request.Name), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }

    [HttpDelete("{id}")]
    [HasPermission(AppPermissions.Pricing.Update)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteCategoryCommand(id), ct);
        return result.Succeeded ? NoContent() : BadRequest(result.Errors);
    }
}

public record CreateCategoryRequest(string Name);
public record UpdateCategoryRequest(string Name);
