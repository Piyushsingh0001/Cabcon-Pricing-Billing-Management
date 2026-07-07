using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Billing;
using Cabcon.Domain.Enums;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Threading;
using System.Threading.Tasks;

namespace Cabcon.Application.Features.Pricing.Quotations;

public record GetPendingApprovalsCountQuery() : IRequest<Result<int>>;

public class GetPendingApprovalsCountQueryHandler : IRequestHandler<GetPendingApprovalsCountQuery, Result<int>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetPendingApprovalsCountQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<int>> Handle(GetPendingApprovalsCountQuery request, CancellationToken cancellationToken)
    {
        var quotationRepo = _unitOfWork.Repository<Quotation>();
        var count = await quotationRepo.Query()
            .CountAsync(q => q.ApprovalStatus == ApprovalStatus.Pending, cancellationToken);
            
        return Result<int>.Success(count);
    }
}
