using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Shared.Exceptions;
using Cabcon.Shared.Wrappers;
using FluentValidation;
using MediatR;

namespace Cabcon.Application.Features.Pricing.Materials;

public record UpdateMaterialPriceCommand : IRequest<Result>
{
    public int MaterialId { get; init; }
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

    public UpdateMaterialPriceCommandHandler(IUnitOfWork unitOfWork, IDateTime dateTime)
    {
        _unitOfWork = unitOfWork;
        _dateTime = dateTime;
    }

    public async Task<Result> Handle(UpdateMaterialPriceCommand request, CancellationToken cancellationToken)
    {
        var repository = _unitOfWork.Repository<Material>();
        var material = await repository.GetByIdAsync(request.MaterialId, cancellationToken);
        if (material == null)
        {
            throw new NotFoundException(nameof(Material), request.MaterialId);
        }

        if (material.Type == Cabcon.Domain.Enums.MaterialType.Exchange)
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

        material.AsOnDate = _dateTime.UtcNow;
        material.IsPlaceholder = false;

        repository.Update(material);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
