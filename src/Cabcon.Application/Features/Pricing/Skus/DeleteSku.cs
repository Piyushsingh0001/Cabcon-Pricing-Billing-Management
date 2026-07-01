using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Shared.Exceptions;
using Cabcon.Shared.Wrappers;
using MediatR;

namespace Cabcon.Application.Features.Pricing.Skus;

public record DeleteSkuCommand(int Id) : IRequest<Result>;

public class DeleteSkuCommandHandler : IRequestHandler<DeleteSkuCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;

    public DeleteSkuCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteSkuCommand request, CancellationToken cancellationToken)
    {
        var skuRepo = _unitOfWork.Repository<Sku>();
        var sku = await skuRepo.GetByIdAsync(request.Id, cancellationToken);
        if (sku == null)
        {
            throw new NotFoundException(nameof(Sku), request.Id);
        }

        skuRepo.Delete(sku);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
