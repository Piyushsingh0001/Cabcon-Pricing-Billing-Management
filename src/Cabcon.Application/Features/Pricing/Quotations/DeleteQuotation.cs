using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Billing;
using Cabcon.Shared.Wrappers;
using MediatR;
using System.Threading;
using System.Threading.Tasks;

namespace Cabcon.Application.Features.Pricing.Quotations;

public record DeleteQuotationCommand(int QuotationId) : IRequest<Result<int>>;

public class DeleteQuotationCommandHandler : IRequestHandler<DeleteQuotationCommand, Result<int>>
{
    private readonly IUnitOfWork _unitOfWork;

    public DeleteQuotationCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<int>> Handle(DeleteQuotationCommand request, CancellationToken cancellationToken)
    {
        var quotationRepo = _unitOfWork.Repository<Quotation>();
        var quotation = await quotationRepo.GetByIdAsync(request.QuotationId, cancellationToken);
        
        if (quotation == null)
            return Result<int>.Failure("Quotation not found.");

        quotation.IsActive = false;
        quotationRepo.Update(quotation);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<int>.Success(quotation.Id);
    }
}
