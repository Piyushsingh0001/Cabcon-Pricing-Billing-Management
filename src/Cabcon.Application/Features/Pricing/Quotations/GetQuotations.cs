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
    public Cabcon.Domain.Enums.ApprovalStatus ApprovalStatus { get; init; }
    public string? CreatedBy { get; init; }
    public bool IsActive { get; init; }
}

public record GetQuotationsQuery : IRequest<IReadOnlyList<QuotationSummaryDto>>;

public class GetQuotationsQueryHandler : IRequestHandler<GetQuotationsQuery, IReadOnlyList<QuotationSummaryDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetQuotationsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<QuotationSummaryDto>> Handle(GetQuotationsQuery request, CancellationToken cancellationToken)
    {
        var quotationRepo = _unitOfWork.Repository<Quotation>();
        var now = DateTime.UtcNow;

        var activeQuotations = await quotationRepo.Query()
            .Where(q => q.IsActive)
            .ToListAsync(cancellationToken);

        var expired = activeQuotations
            .Where(q => q.QuotationDate.AddDays(q.ValidityDays) < now)
            .ToList();

        if (expired.Any())
        {
            foreach (var q in expired)
            {
                q.IsActive = false;
                quotationRepo.Update(q);
            }
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return await quotationRepo.Query()
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
                TotalGross = q.TotalGross,
                ApprovalStatus = q.ApprovalStatus,
                CreatedBy = q.CreatedBy,
                IsActive = q.IsActive
            })
            .ToListAsync(cancellationToken);
    }
}
