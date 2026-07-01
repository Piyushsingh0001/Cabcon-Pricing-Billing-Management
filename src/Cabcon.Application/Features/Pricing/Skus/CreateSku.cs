using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Cabcon.Shared.Wrappers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Skus;

public record CreateSkuBomLineInput(int MaterialId, decimal WeightKg);

public record CreateSkuCommand : IRequest<Result<int>>
{
    public int CategoryId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Spec { get; init; } = string.Empty;
    public string Unit { get; init; } = string.Empty;
    public ConversionType ConversionType { get; init; }
    public decimal ConversionValue { get; init; }
    public decimal GstRate { get; init; }
    public List<CreateSkuBomLineInput> BomLines { get; init; } = new();
}

public class CreateSkuCommandValidator : AbstractValidator<CreateSkuCommand>
{
    public CreateSkuCommandValidator()
    {
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

public class CreateSkuCommandHandler : IRequestHandler<CreateSkuCommand, Result<int>>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateSkuCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<int>> Handle(CreateSkuCommand request, CancellationToken cancellationToken)
    {
        var categoryRepo = _unitOfWork.Repository<Category>();
        var category = await categoryRepo.GetByIdAsync(request.CategoryId, cancellationToken);
        if (category == null)
        {
            return Result<int>.Failure("Invalid CategoryId.");
        }

        var materialRepo = _unitOfWork.Repository<Material>();
        var materialIds = request.BomLines.Select(b => b.MaterialId).Distinct().ToList();
        var materialsCount = await materialRepo.Query()
            .CountAsync(m => materialIds.Contains(m.Id), cancellationToken);

        if (materialsCount != materialIds.Count)
        {
            return Result<int>.Failure("One or more Material IDs are invalid.");
        }

        var sku = new Sku
        {
            CategoryId = request.CategoryId,
            Name = request.Name,
            Spec = request.Spec,
            Unit = request.Unit,
            ConversionType = request.ConversionType,
            ConversionValue = request.ConversionValue,
            GstRate = request.GstRate,
            IsPlaceholder = false
        };

        int order = 0;
        foreach (var bomInput in request.BomLines)
        {
            sku.BomLines.Add(new SkuBomLine
            {
                MaterialId = bomInput.MaterialId,
                WeightKg = bomInput.WeightKg,
                LineOrder = ++order
            });
        }

        var skuRepo = _unitOfWork.Repository<Sku>();
        await skuRepo.AddAsync(sku, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<int>.Success(sku.Id);
    }
}
