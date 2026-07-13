using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Billing;
using MediatR;

namespace Cabcon.Application.Features.Billing.Customers.Commands.CreateCustomer;

public record CreateCustomerCommand(string Name, string? ContactNumber, string? GstNumber, string? Address) : IRequest<int>;

public class CreateCustomerCommandHandler : IRequestHandler<CreateCustomerCommand, int>
{
    private readonly IApplicationDbContext _db;

    public CreateCustomerCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<int> Handle(CreateCustomerCommand request, CancellationToken cancellationToken)
    {
        var customer = new Customer
        {
            Name = request.Name,
            ContactNumber = request.ContactNumber,
            GstNumber = request.GstNumber,
            Address = request.Address
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(cancellationToken);

        return customer.Id;
    }
}
