using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Cabcon.Shared.Exceptions;
using Cabcon.Shared.Wrappers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Skus;

public record UpdateSkuBomLineInput(int MaterialId, decimal WeightKg);

public record UpdateSkuCommand : IRequest<Result>
{
    public int Id { get; init; }
    public int CategoryId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Spec { get; init; } = string.Empty;
    public string Unit { get; init; } = string.Empty;
    public ConversionType ConversionType { get; init; }
    public decimal ConversionValue { get; init; }
    public decimal GstRate { get; init; }
    public List<UpdateSkuBomLineInput> BomLines { get; init; } = new();
}

public class UpdateSkuCommandValidator : AbstractValidator<UpdateSkuCommand>
{
    public UpdateSkuCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Spec).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Unit).NotEmpty().MaximumLength(50);
        RuleFor(x => x.CategoryId).GreaterThan(0);
        RuleFor(x => x.ConversionValue).GreaterThanOrEqualTo(0);
        RuleFor(x => x.GstRate).GreaterThanOrEqualTo(0).LessThanOrEqualTo(1);
        RuleFor(x => x.BomLines).NotEmpty().WithMessage("At least one BOM line is required.");
        
        RuleForEach(x => x.BomLines).ChildRules(line =>
        {
            line.RuleFor(l => l.MaterialId).GreaterThan(0);
            line.RuleFor(l => l.WeightKg).GreaterThan(0).WithMessage("Weight must be greater than 0 kg.");
        });
    }
}

public class UpdateSkuCommandHandler : IRequestHandler<UpdateSkuCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;

    public UpdateSkuCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(UpdateSkuCommand request, CancellationToken cancellationToken)
    {
        var skuRepo = _unitOfWork.Repository<Sku>();
        var sku = await skuRepo.Query()
            .Include(s => s.BomLines)
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

        if (sku == null)
        {
            throw new NotFoundException(nameof(Sku), request.Id);
        }

        var categoryRepo = _unitOfWork.Repository<Category>();
        var category = await categoryRepo.GetByIdAsync(request.CategoryId, cancellationToken);
        if (category == null)
        {
            return Result.Failure("Invalid CategoryId.");
        }

        var materialRepo = _unitOfWork.Repository<Material>();
        var materialIds = request.BomLines.Select(b => b.MaterialId).Distinct().ToList();
        var materialsCount = await materialRepo.Query()
            .CountAsync(m => materialIds.Contains(m.Id), cancellationToken);

        if (materialsCount != materialIds.Count)
        {
            return Result.Failure("One or more Material IDs are invalid.");
        }

        // Update scalar values
        sku.CategoryId = request.CategoryId;
        sku.Name = request.Name;
        sku.Spec = request.Spec;
        sku.Unit = request.Unit;
        sku.ConversionType = request.ConversionType;
        sku.ConversionValue = request.ConversionValue;
        sku.GstRate = request.GstRate;
        sku.IsPlaceholder = false;

        // Clear existing and rebuild BOM lines (simple replacement approach)
        sku.BomLines.Clear();

        int order = 0;
        foreach (var bomInput in request.BomLines)
        {
            sku.BomLines.Add(new SkuBomLine
            {
                SkuId = sku.Id,
                MaterialId = bomInput.MaterialId,
                WeightKg = bomInput.WeightKg,
                LineOrder = ++order
            });
        }

        skuRepo.Update(sku);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
