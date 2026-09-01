using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Cabcon.Domain.Services;
using Cabcon.Shared.Exceptions;
using Cabcon.Shared.Wrappers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Materials;

public record UpdateMaterialPriceCommand : IRequest<Result>
{
    public int MaterialId { get; init; }
    public MaterialType? Type { get; init; }
    public int? VendorId { get; init; }
    public string? VendorName { get; init; }
    public decimal? LmeUsdPerMt { get; init; }
    public decimal? PremiumUsdPerMt { get; init; }
    public decimal? FxRate { get; init; }
    public decimal? FreightInrPerKg { get; init; }
    public decimal? FreightInrPerMt { get; init; }
    public decimal? DirectRateInrPerKg { get; init; }
}

public class UpdateMaterialPriceCommandValidator : AbstractValidator<UpdateMaterialPriceCommand>
{
    public UpdateMaterialPriceCommandValidator()
    {
        RuleFor(x => x.MaterialId).GreaterThan(0);
        
        When(x => x.Type == MaterialType.Exchange, () =>
        {
            RuleFor(x => x.LmeUsdPerMt)
                .NotNull().WithMessage("LME (USD/MT) is required.")
                .GreaterThan(0).WithMessage("LME (USD/MT) must be greater than 0.");
            RuleFor(x => x.FxRate)
                .NotNull().WithMessage("FX Rate is required.")
                .GreaterThan(0).WithMessage("FX Rate must be greater than 0.");
            RuleFor(x => x.PremiumUsdPerMt)
                .NotNull().WithMessage("Premium (USD/MT) is required.")
                .GreaterThanOrEqualTo(0).WithMessage("Premium (USD/MT) cannot be negative.");
            RuleFor(x => x.FreightInrPerKg)
                .GreaterThanOrEqualTo(0).When(x => x.FreightInrPerKg.HasValue);
            RuleFor(x => x.FreightInrPerMt)
                .GreaterThanOrEqualTo(0).When(x => x.FreightInrPerMt.HasValue);
        });

        When(x => x.Type == MaterialType.Direct, () =>
        {
            RuleFor(x => x.DirectRateInrPerKg)
                .NotNull().WithMessage("Direct Price (₹/kg) is required.")
                .GreaterThan(0).WithMessage("Direct Price (₹/kg) must be greater than 0.");
            RuleFor(x => x.VendorName)
                .NotEmpty().WithMessage("Vendor is required for Direct price update.")
                .When(x => !x.VendorId.HasValue);
        });
    }
}

public class UpdateMaterialPriceCommandHandler : IRequestHandler<UpdateMaterialPriceCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTime _dateTime;
    private readonly PricingCalculationService _pricingService = new();

    public UpdateMaterialPriceCommandHandler(IUnitOfWork unitOfWork, IDateTime dateTime)
    {
        _unitOfWork = unitOfWork;
        _dateTime = dateTime;
    }

    public async Task<Result> Handle(UpdateMaterialPriceCommand request, CancellationToken cancellationToken)
    {
        var repository = _unitOfWork.Repository<Material>();
        var material = await repository.Query()
            .FirstOrDefaultAsync(m => m.Id == request.MaterialId, cancellationToken);

        if (material == null)
        {
            throw new NotFoundException(nameof(Material), request.MaterialId);
        }

        var today = _dateTime.UtcNow.Date;
        var localToday = DateTime.Today;
        var targetType = request.Type ?? MaterialType.Exchange;

        int? resolvedVendorId = null;
        if (targetType == MaterialType.Direct)
        {
            resolvedVendorId = request.VendorId;
            if (!resolvedVendorId.HasValue && !string.IsNullOrWhiteSpace(request.VendorName))
            {
                var trimmedVName = request.VendorName.Trim();
                var vendorRepo = _unitOfWork.Repository<Vendor>();
                var vendor = await vendorRepo.Query().FirstOrDefaultAsync(v => v.Name.ToLower() == trimmedVName.ToLower(), cancellationToken);
                if (vendor == null)
                {
                    vendor = new Vendor { Name = trimmedVName };
                    await vendorRepo.AddAsync(vendor, cancellationToken);
                    await _unitOfWork.SaveChangesAsync(cancellationToken);
                }
                resolvedVendorId = vendor.Id;
            }
        }

        var historyRepo = _unitOfWork.Repository<MaterialPriceHistory>();

        // Guard: only one price stamp allowed per material per type (and per vendor for Direct) per day
        bool hasUpdatedTodayForType;
        if (targetType == MaterialType.Direct)
        {
            hasUpdatedTodayForType = await historyRepo.Query()
                .AnyAsync(x => x.MaterialId == request.MaterialId 
                            && (x.EffectiveDate.Date == today || x.EffectiveDate.Date == localToday) 
                            && x.Type == MaterialType.Direct 
                            && x.VendorId == resolvedVendorId, cancellationToken);
        }
        else
        {
            hasUpdatedTodayForType = await historyRepo.Query()
                .AnyAsync(x => x.MaterialId == request.MaterialId 
                            && (x.EffectiveDate.Date == today || x.EffectiveDate.Date == localToday) 
                            && x.Type == MaterialType.Exchange, cancellationToken);
        }

        if (hasUpdatedTodayForType)
        {
            return Result.Failure("Price has already been updated today. You can only update the price once per day.");
        }

        // Determine freight in ₹/kg (convert from ₹/MT if provided as FreightInrPerMt)
        decimal? freightPerKg = request.FreightInrPerKg;
        if (!freightPerKg.HasValue && request.FreightInrPerMt.HasValue)
        {
            freightPerKg = request.FreightInrPerMt.Value / 1000m;
        }

        var landedCost = targetType == MaterialType.Exchange
            ? _pricingService.LandedCost(MaterialType.Exchange, request.LmeUsdPerMt, request.PremiumUsdPerMt, request.FxRate, freightPerKg, null)
            : (request.DirectRateInrPerKg ?? 0);

        var stampTime = _dateTime.UtcNow;

        var history = new MaterialPriceHistory
        {
            MaterialId = material.Id,
            Type = targetType,
            VendorId = targetType == MaterialType.Direct ? resolvedVendorId : null,
            LmeUsdPerMt = request.LmeUsdPerMt,
            PremiumUsdPerMt = request.PremiumUsdPerMt,
            FxRate = request.FxRate,
            FreightInrPerKg = freightPerKg,
            DirectRateInrPerKg = request.DirectRateInrPerKg,
            LandedCostInrPerKg = landedCost,
            EffectiveDate = today,
            CreatedDate = stampTime,
            CreatedBy = "price-update"
        };

        await historyRepo.AddAsync(history, cancellationToken);

        // Ensure vendor mapping is registered if vendor was resolved for Direct
        if (targetType == MaterialType.Direct && resolvedVendorId.HasValue)
        {
            var mvRepo = _unitOfWork.Repository<MaterialVendor>();
            var mappingExists = await mvRepo.Query()
                .AnyAsync(mv => mv.MaterialId == material.Id && mv.VendorId == resolvedVendorId.Value, cancellationToken);

            if (!mappingExists)
            {
                await mvRepo.AddAsync(new MaterialVendor
                {
                    MaterialId = material.Id,
                    VendorId = resolvedVendorId.Value
                }, cancellationToken);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
