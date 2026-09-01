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
    public decimal? LmeUsdPerMt { get; init; }
    public decimal? PremiumUsdPerMt { get; init; }
    public decimal? FxRate { get; init; }
    public decimal? FreightInrPerMt { get; init; }
    public decimal? DirectRateInrPerKg { get; init; }
}

public class UpdateMaterialPriceCommandValidator : AbstractValidator<UpdateMaterialPriceCommand>
{
    public UpdateMaterialPriceCommandValidator()
    {
        RuleFor(x => x.MaterialId).GreaterThan(0);
        
        RuleFor(x => x.LmeUsdPerMt)
            .GreaterThanOrEqualTo(0).When(x => x.LmeUsdPerMt.HasValue);
        RuleFor(x => x.PremiumUsdPerMt)
            .GreaterThanOrEqualTo(0).When(x => x.PremiumUsdPerMt.HasValue);
        RuleFor(x => x.FxRate)
            .GreaterThanOrEqualTo(0).When(x => x.FxRate.HasValue);
        RuleFor(x => x.FreightInrPerMt)
            .GreaterThanOrEqualTo(0).When(x => x.FreightInrPerMt.HasValue);
        RuleFor(x => x.DirectRateInrPerKg)
            .GreaterThanOrEqualTo(0).When(x => x.DirectRateInrPerKg.HasValue);
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
            .Include(m => m.Vendor)
            .FirstOrDefaultAsync(m => m.Id == request.MaterialId, cancellationToken);

        if (material == null)
        {
            throw new NotFoundException(nameof(Material), request.MaterialId);
        }

        var today = _dateTime.UtcNow.Date;
        var targetType = request.Type ?? material.Type;

        // Guard: only one price stamp allowed per material per type per day
        var hasUpdatedTodayForType = await _unitOfWork.Repository<MaterialPriceHistory>().Query()
            .AnyAsync(x => x.MaterialId == request.MaterialId && x.EffectiveDate.Date == today && x.Type == targetType, cancellationToken);

        if (hasUpdatedTodayForType && !material.IsPlaceholder)
        {
            return Result.Failure("Price has already been updated today. You can only update the price once per day.");
        }

        // Apply new price values to the material entity
        if (targetType == Cabcon.Domain.Enums.MaterialType.Exchange)
        {
            material.LmeUsdPerMt = request.LmeUsdPerMt;
            material.PremiumUsdPerMt = request.PremiumUsdPerMt;
            material.FxRate = request.FxRate;
            material.FreightInrPerMt = request.FreightInrPerMt;
        }
        else
        {
            material.DirectRateInrPerKg = request.DirectRateInrPerKg;
        }

        var stampTime = _dateTime.UtcNow;
        material.AsOnDate = stampTime;
        material.IsPlaceholder = false;
        material.Type = targetType;

        repository.Update(material);

        // Append a history row for every stamp (domain contract: each stamp is immutable audit trail)
        var landedCost = targetType == MaterialType.Exchange
            ? (((material.LmeUsdPerMt ?? 0) + (material.PremiumUsdPerMt ?? 0)) * (material.FxRate ?? 0) + (material.FreightInrPerMt ?? 0)) / 1000m
            : (material.DirectRateInrPerKg ?? 0);

        var history = new MaterialPriceHistory
        {
            MaterialId = material.Id,
            Type = targetType,
            VendorName = targetType == MaterialType.Direct ? material.Vendor?.Name : null,
            LmeUsdPerMt = material.LmeUsdPerMt,
            PremiumUsdPerMt = material.PremiumUsdPerMt,
            FxRate = material.FxRate,
            FreightInrPerMt = material.FreightInrPerMt,
            DirectRateInrPerKg = material.DirectRateInrPerKg,
            LandedCostInrPerKg = landedCost,
            EffectiveDate = today,
            CreatedDate = stampTime,
            CreatedBy = "price-update"
        };

        await _unitOfWork.Repository<MaterialPriceHistory>().AddAsync(history, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
