using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Billing;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Cabcon.Shared.Wrappers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Quotations;

public record SaveQuotationLineInput
{
    public int SkuId { get; init; }
    public decimal RmCostSnapshot { get; init; }
    public decimal MfgCostSnapshot { get; init; }
    public decimal OfferExGst { get; init; }
    public decimal Profit { get; init; }
    public decimal GstPercent { get; init; }
    public decimal GstAmount { get; init; }
    public decimal GrossRate { get; init; }
}

public record SaveQuotationResponse(int Id, string QuotationNumber);

public record SaveQuotationCommand : IRequest<Result<SaveQuotationResponse>>
{
    public string PartyName { get; init; } = string.Empty;
    public int ValidityDays { get; init; }
    public string PriceBasisNote { get; init; } = string.Empty;
    public List<SaveQuotationLineInput> Lines { get; init; } = new();
}

public class SaveQuotationCommandValidator : AbstractValidator<SaveQuotationCommand>
{
    public SaveQuotationCommandValidator()
    {
        RuleFor(x => x.PartyName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ValidityDays).GreaterThan(0);
        RuleFor(x => x.Lines).NotEmpty().WithMessage("Quotation must have at least one line.");
        
        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.SkuId).GreaterThan(0);
            line.RuleFor(l => l.RmCostSnapshot).GreaterThanOrEqualTo(0);
            line.RuleFor(l => l.MfgCostSnapshot).GreaterThanOrEqualTo(0);
            line.RuleFor(l => l.OfferExGst).GreaterThanOrEqualTo(0);
            line.RuleFor(l => l.Profit).GreaterThanOrEqualTo(0);
            line.RuleFor(l => l.GstPercent).GreaterThanOrEqualTo(0).LessThanOrEqualTo(1);
            line.RuleFor(l => l.GstAmount).GreaterThanOrEqualTo(0);
            line.RuleFor(l => l.GrossRate).GreaterThanOrEqualTo(0);
        });
    }
}

public class SaveQuotationCommandHandler : IRequestHandler<SaveQuotationCommand, Result<SaveQuotationResponse>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTime _dateTime;
    private readonly ICurrentUserService _currentUser;

    public SaveQuotationCommandHandler(IUnitOfWork unitOfWork, IDateTime dateTime, ICurrentUserService currentUser)
    {
        _unitOfWork = unitOfWork;
        _dateTime = dateTime;
        _currentUser = currentUser;
    }

    public async Task<Result<SaveQuotationResponse>> Handle(SaveQuotationCommand request, CancellationToken cancellationToken)
    {
        var skuRepo = _unitOfWork.Repository<Sku>();
        var skuIds = request.Lines.Select(l => l.SkuId).Distinct().ToList();
        var skus = await skuRepo.Query()
            .Include(s => s.Category)
            .Where(s => skuIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, cancellationToken);

        if (skus.Count != skuIds.Count)
        {
            return Result<SaveQuotationResponse>.Failure("One or more SKU IDs are invalid.");
        }

        var today = _dateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        
        var quotationRepo = _unitOfWork.Repository<Quotation>();
        var todayCount = await quotationRepo.Query()
            .CountAsync(q => q.CreatedDate >= today && q.CreatedDate < tomorrow, cancellationToken);

        var sequence = todayCount + 1;
        var quotationNumber = $"CIL/Q/{_dateTime.UtcNow:yyyyMMdd}/{sequence:D3}";

        var totalExGst = request.Lines.Sum(l => l.OfferExGst);
        var totalGst = request.Lines.Sum(l => l.GstAmount);
        var totalGross = request.Lines.Sum(l => l.GrossRate);

        var quotation = new Quotation
        {
            QuotationNumber = quotationNumber,
            QuotationDate = _dateTime.UtcNow,
            PartyName = request.PartyName,
            ValidityDays = request.ValidityDays,
            PriceBasisNote = request.PriceBasisNote,
            TotalExGst = totalExGst,
            TotalGst = totalGst,
            TotalGross = totalGross,
            ApprovalStatus = _currentUser.Roles.Contains("Super Admin") ? ApprovalStatus.Approved : ApprovalStatus.Pending
        };

        int order = 0;
        foreach (var lineInput in request.Lines)
        {
            var sku = skus[lineInput.SkuId];
            quotation.Lines.Add(new QuotationLine
            {
                SkuId = lineInput.SkuId,
                DescriptionSnapshot = $"{sku.Category.Name} - {sku.Name} {sku.Spec}",
                Unit = sku.Unit,
                RmCostSnapshot = lineInput.RmCostSnapshot,
                MfgCostSnapshot = lineInput.MfgCostSnapshot,
                OfferExGst = lineInput.OfferExGst,
                Profit = lineInput.Profit,
                GstPercent = lineInput.GstPercent,
                GstAmount = lineInput.GstAmount,
                GrossRate = lineInput.GrossRate,
                LineOrder = ++order
            });
        }

        await quotationRepo.AddAsync(quotation, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<SaveQuotationResponse>.Success(new SaveQuotationResponse(quotation.Id, quotationNumber));
    }
}
