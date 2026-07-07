using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Billing;
using Cabcon.Domain.Enums;
using Cabcon.Shared.Wrappers;
using MediatR;
using System.Threading;
using System.Threading.Tasks;

namespace Cabcon.Application.Features.Pricing.Quotations;

public record ApproveQuotationCommand(int QuotationId, ApprovalStatus Status) : IRequest<Result<int>>;

public class ApproveQuotationCommandHandler : IRequestHandler<ApproveQuotationCommand, Result<int>>
{
    private readonly IUnitOfWork _unitOfWork;

    public ApproveQuotationCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<int>> Handle(ApproveQuotationCommand request, CancellationToken cancellationToken)
    {
        var quotationRepo = _unitOfWork.Repository<Quotation>();
        var quotation = await quotationRepo.GetByIdAsync(request.QuotationId, cancellationToken);
        
        if (quotation == null)
            return Result<int>.Failure("Quotation not found.");

        if (request.Status == ApprovalStatus.Pending)
            return Result<int>.Failure("Cannot set status to pending.");

        quotation.ApprovalStatus = request.Status;
        quotationRepo.Update(quotation);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<int>.Success(quotation.Id);
    }
}
