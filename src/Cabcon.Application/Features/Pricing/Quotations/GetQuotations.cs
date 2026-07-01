using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Billing;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Quotations;

public record QuotationSummaryDto
{
    public int Id { get; init; }
    public string QuotationNumber { get; init; } = string.Empty;
    public DateTime QuotationDate { get; init; }
    public string PartyName { get; init; } = string.Empty;
    public int ValidityDays { get; init; }
    public decimal TotalExGst { get; init; }
    public decimal TotalGst { get; init; }
    public decimal TotalGross { get; init; }
}

public record GetQuotationsQuery : IRequest<IReadOnlyList<QuotationSummaryDto>>;

public class GetQuotationsQueryHandler : IRequestHandler<GetQuotationsQuery, IReadOnlyList<QuotationSummaryDto>>
{
    private readonly IRepository<Quotation> _repository;

    public GetQuotationsQueryHandler(IRepository<Quotation> repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<QuotationSummaryDto>> Handle(GetQuotationsQuery request, CancellationToken cancellationToken)
    {
        return await _repository.Query()
            .OrderByDescending(q => q.QuotationDate)
            .Select(q => new QuotationSummaryDto
            {
                Id = q.Id,
                QuotationNumber = q.QuotationNumber,
                QuotationDate = q.QuotationDate,
                PartyName = q.PartyName,
                ValidityDays = q.ValidityDays,
                TotalExGst = q.TotalExGst,
                TotalGst = q.TotalGst,
                TotalGross = q.TotalGross
            })
            .ToListAsync(cancellationToken);
    }
}
