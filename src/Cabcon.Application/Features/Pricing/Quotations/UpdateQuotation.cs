using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Billing;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Cabcon.Shared.Wrappers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
// Copyright © 2026 Piyush Singh
// Project: Cabcon Pricing & Billing Management
namespace Cabcon.Application.Features.Pricing.Quotations;

public record UpdateQuotationLineInput
{
    public int SkuId { get; init; }
    public decimal RmCostSnapshot { get; init; }
    public decimal MfgCostSnapshot { get; init; }
    public decimal OfferExGst { get; init; }
    public decimal Profit { get; init; }
}

public record UpdateQuotationResponse(int Id, string QuotationNumber);

public record UpdateQuotationCommand : IRequest<Result<UpdateQuotationResponse>>
{
    public int Id { get; init; }
    public string PartyName { get; init; } = string.Empty;
    public string PartyAddress { get; init; } = string.Empty;
    public int ValidityDays { get; init; }
    public bool IsDraft { get; init; }

    public List<UpdateQuotationLineInput> Lines { get; init; } = new();
}

public class UpdateQuotationCommandValidator : AbstractValidator<UpdateQuotationCommand>
{
    public UpdateQuotationCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
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

        });
    }
}

public class UpdateQuotationCommandHandler : IRequestHandler<UpdateQuotationCommand, Result<UpdateQuotationResponse>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;

    public UpdateQuotationCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
    }

    public async Task<Result<UpdateQuotationResponse>> Handle(UpdateQuotationCommand request, CancellationToken cancellationToken)
    {
        var quotationRepo = _unitOfWork.Repository<Quotation>();
        var quotation = await quotationRepo.Query()
            .Include(q => q.Lines)
            .FirstOrDefaultAsync(q => q.Id == request.Id, cancellationToken);

        if (quotation == null)
            return Result<UpdateQuotationResponse>.Failure("Quotation not found.");

        var skuRepo = _unitOfWork.Repository<Sku>();
        var skuIds = request.Lines.Select(l => l.SkuId).Distinct().ToList();
        var skus = await skuRepo.Query()
            .Include(s => s.Category)
            .Where(s => skuIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, cancellationToken);

        if (skus.Count != skuIds.Count)
        {
            return Result<UpdateQuotationResponse>.Failure("One or more SKU IDs are invalid.");
        }

        var totalExGst = request.Lines.Sum(l => l.OfferExGst);
        var totalGst = 0m;
        var totalGross = totalExGst;

        var currentNumber = quotation.QuotationNumber ?? "";
        
        if (!request.IsDraft && string.IsNullOrEmpty(currentNumber))
        {
            var today = System.DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            var todayCount = await quotationRepo.Query()
                .CountAsync(q => q.CreatedDate >= today && q.CreatedDate < tomorrow && q.QuotationNumber != "", cancellationToken);
            var sequence = todayCount + 1;
            quotation.QuotationNumber = $"CIL/Q/{System.DateTime.UtcNow:yyyyMMdd}/{sequence:D3}";
        }
        else if (!request.IsDraft)
        {
            int lastUnderscore = currentNumber.LastIndexOf('_');
            if (lastUnderscore > 0 && lastUnderscore > currentNumber.LastIndexOf('/'))
            {
                var prefix = currentNumber.Substring(0, lastUnderscore);
                var suffixString = currentNumber.Substring(lastUnderscore + 1);
                if (int.TryParse(suffixString, out int suffixValue))
                {
                    quotation.QuotationNumber = $"{prefix}_{suffixValue + 1}";
                }
                else
                {
                    quotation.QuotationNumber = $"{currentNumber}_1";
                }
            }
            else if (!string.IsNullOrEmpty(currentNumber))
            {
                quotation.QuotationNumber = $"{currentNumber}_1";
            }
        }

        quotation.PartyName = request.PartyName;
        quotation.PartyAddress = request.PartyAddress;
        quotation.ValidityDays = request.ValidityDays;
        quotation.PriceBasisNote = string.Empty;
        quotation.TotalExGst = totalExGst;
        quotation.TotalGst = totalGst;
        quotation.TotalGross = totalGross;
        
        bool isSuperAdmin = _currentUser.Roles.Contains("Super Admin");
        if (request.IsDraft)
        {
            quotation.ApprovalStatus = ApprovalStatus.Draft;
        }
        else if (!isSuperAdmin)
        {
            quotation.ApprovalStatus = ApprovalStatus.Pending;
        }
        else
        {
            quotation.ApprovalStatus = ApprovalStatus.Approved;
        }

        quotation.Lines.Clear();

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
                GstPercent = 0m,
                GstAmount = 0m,
                GrossRate = lineInput.OfferExGst,
                LineOrder = ++order
            });
        }

        quotationRepo.Update(quotation);
        
        if (!request.IsDraft)
        {
            var trackingRepo = _unitOfWork.Repository<QuotationTracking>();
            await trackingRepo.AddAsync(new QuotationTracking
            {
                Quotation = quotation,
                QuotationNumber = quotation.QuotationNumber,
                Action = "Revised & Submitted for Approval",
                Details = $"Quotation revised and sent for approval by {_currentUser.UserName}."
            }, cancellationToken);
        }
        
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<UpdateQuotationResponse>.Success(new UpdateQuotationResponse(quotation.Id, quotation.QuotationNumber));
    }
}
