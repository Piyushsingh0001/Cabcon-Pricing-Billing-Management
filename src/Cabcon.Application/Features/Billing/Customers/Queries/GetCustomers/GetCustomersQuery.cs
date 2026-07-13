using Cabcon.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Billing.Customers.Queries.GetCustomers;

public record CustomerSummary(int Id, string Name, string? ContactNumber, string? GstNumber, string? Address, string? UpdatedBy, DateTime? UpdatedDate);

public record GetCustomersQuery : IRequest<List<CustomerSummary>>;

public class GetCustomersQueryHandler : IRequestHandler<GetCustomersQuery, List<CustomerSummary>>
{
    private readonly IApplicationDbContext _db;

    public GetCustomersQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<List<CustomerSummary>> Handle(GetCustomersQuery request, CancellationToken cancellationToken)
    {
        return await _db.Customers
            .Select(c => new CustomerSummary(
                c.Id,
                c.Name,
                c.ContactNumber,
                c.GstNumber,
                c.Address,
                c.UpdatedBy ?? c.CreatedBy,
                c.UpdatedDate ?? c.CreatedDate
            ))
            .ToListAsync(cancellationToken);
    }
}
