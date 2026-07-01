using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Shared.Exceptions;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Categories;

public record DeleteCategoryCommand(int Id) : IRequest<Result>;

public class DeleteCategoryCommandHandler : IRequestHandler<DeleteCategoryCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;

    public DeleteCategoryCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteCategoryCommand request, CancellationToken cancellationToken)
    {
        var categoryRepository = _unitOfWork.Repository<Category>();
        var skuRepository = _unitOfWork.Repository<Sku>();

        var category = await categoryRepository.GetByIdAsync(request.Id, cancellationToken);
        if (category == null)
        {
            throw new NotFoundException(nameof(Category), request.Id);
        }

        // Check if there are active (non-deleted) SKUs in this category
        var hasSkus = await skuRepository.Query()
            .AnyAsync(s => s.CategoryId == request.Id, cancellationToken);

        if (hasSkus)
        {
            return Result.Failure("Cannot delete category because it has active products.");
        }

        categoryRepository.Delete(category);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
