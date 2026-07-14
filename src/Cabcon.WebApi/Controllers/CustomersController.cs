using Cabcon.Application.Features.Billing.Customers.Commands.CreateCustomer;
using Cabcon.Application.Features.Billing.Customers.Commands.DeleteCustomer;
using Cabcon.Application.Features.Billing.Customers.Commands.UpdateCustomer;
using Cabcon.Application.Features.Billing.Customers.Queries.GetCustomers;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cabcon.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly IMediator _mediator;

    public CustomersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<List<CustomerSummary>>> GetAll()
    {
        return await _mediator.Send(new GetCustomersQuery());
    }

    [HttpPost]
    // Note: The UI restricts this to Admin/Super Admin, we can optionally enforce it here
    [Authorize(Roles = "Admin,Super Admin")]
    public async Task<ActionResult<int>> Create([FromBody] CreateCustomerCommand command)
    {
        return await _mediator.Send(command);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Super Admin")]
    public async Task<ActionResult> Delete(int id)
    {
        await _mediator.Send(new DeleteCustomerCommand(id));
        return NoContent();
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Super Admin")]
    public async Task<ActionResult> Update(int id, [FromBody] UpdateCustomerCommand command)
    {
        if (id != command.Id) return BadRequest();
        await _mediator.Send(command);
        return NoContent();
    }
}
