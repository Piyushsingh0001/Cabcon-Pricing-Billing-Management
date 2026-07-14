using Cabcon.Shared.Exceptions;
using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Billing;
using MediatR;

namespace Cabcon.Application.Features.Billing.Customers.Commands.UpdateCustomer;

public record UpdateCustomerCommand(int Id, string Name, string? ContactNumber, string? GstNumber, string? Address) : IRequest;

public class UpdateCustomerCommandHandler : IRequestHandler<UpdateCustomerCommand>
{
    private readonly IApplicationDbContext _db;

    public UpdateCustomerCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task Handle(UpdateCustomerCommand request, CancellationToken cancellationToken)
    {
        var customer = await _db.Customers.FindAsync(new object[] { request.Id }, cancellationToken);
        if (customer == null)
            throw new Cabcon.Shared.Exceptions.NotFoundException(nameof(Customer), request.Id);

        customer.Name = request.Name;
        customer.ContactNumber = request.ContactNumber;
        customer.GstNumber = request.GstNumber;
        customer.Address = request.Address;

        await _db.SaveChangesAsync(cancellationToken);
    }
}
