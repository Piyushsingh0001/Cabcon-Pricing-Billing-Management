using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Billing;
using Cabcon.Shared.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Quotations;

public record QuotationLineDto
{
    public int SkuId { get; init; }
    public string DescriptionSnapshot { get; init; } = string.Empty;
    public string Unit { get; init; } = string.Empty;
    public decimal RmCostSnapshot { get; init; }
    public decimal MfgCostSnapshot { get; init; }
    public decimal OfferExGst { get; init; }
    public int LineOrder { get; init; }
}

public record QuotationDetailsDto
{
    public int Id { get; init; }
    public string QuotationNumber { get; init; } = string.Empty;
    public DateTime QuotationDate { get; init; }
    public string PartyName { get; init; } = string.Empty;
    public int ValidityDays { get; init; }
    public decimal TotalExGst { get; init; }
    public Cabcon.Domain.Enums.ApprovalStatus ApprovalStatus { get; init; }
    public IReadOnlyList<QuotationLineDto> Lines { get; init; } = Array.Empty<QuotationLineDto>();
}

public record GetQuotationDetailsQuery(int Id) : IRequest<QuotationDetailsDto>;

public class GetQuotationDetailsQueryHandler : IRequestHandler<GetQuotationDetailsQuery, QuotationDetailsDto>
{
    private readonly IRepository<Quotation> _repository;

    public GetQuotationDetailsQueryHandler(IRepository<Quotation> repository)
    {
        _repository = repository;
    }

    public async Task<QuotationDetailsDto> Handle(GetQuotationDetailsQuery request, CancellationToken cancellationToken)
    {
        var quotation = await _repository.Query()
            .Include(q => q.Lines)
            .FirstOrDefaultAsync(q => q.Id == request.Id, cancellationToken);

        if (quotation == null)
        {
            throw new NotFoundException(nameof(Quotation), request.Id);
        }

        var lines = quotation.Lines
            .OrderBy(l => l.LineOrder)
            .Select(l => new QuotationLineDto
            {
                SkuId = l.SkuId,
                DescriptionSnapshot = l.DescriptionSnapshot,
                Unit = l.Unit,
                RmCostSnapshot = l.RmCostSnapshot,
                MfgCostSnapshot = l.MfgCostSnapshot,
                OfferExGst = l.OfferExGst,
                LineOrder = l.LineOrder
            })
            .ToList();

        return new QuotationDetailsDto
        {
            Id = quotation.Id,
            QuotationNumber = quotation.QuotationNumber,
            QuotationDate = quotation.QuotationDate,
            PartyName = quotation.PartyName,
            ValidityDays = quotation.ValidityDays,
            TotalExGst = quotation.TotalExGst,
            ApprovalStatus = quotation.ApprovalStatus,
            Lines = lines
        };
    }
}
