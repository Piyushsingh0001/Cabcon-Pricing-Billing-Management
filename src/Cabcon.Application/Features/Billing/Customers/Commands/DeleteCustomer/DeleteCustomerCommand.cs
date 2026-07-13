using Cabcon.Shared.Exceptions;
using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Billing;
using MediatR;

namespace Cabcon.Application.Features.Billing.Customers.Commands.DeleteCustomer;

public record DeleteCustomerCommand(int Id) : IRequest;

public class DeleteCustomerCommandHandler : IRequestHandler<DeleteCustomerCommand>
{
    private readonly IApplicationDbContext _db;

    public DeleteCustomerCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task Handle(DeleteCustomerCommand request, CancellationToken cancellationToken)
    {
        var customer = await _db.Customers.FindAsync(new object[] { request.Id }, cancellationToken);
        if (customer == null)
            throw new NotFoundException(nameof(Customer), request.Id);

        _db.Customers.Remove(customer);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
