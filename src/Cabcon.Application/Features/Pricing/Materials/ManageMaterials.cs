using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Cabcon.Shared.Wrappers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Materials;

// --- CREATE MATERIAL ---
public record CreateMaterialCommand(
    string Name,
    string? VendorName,
    MaterialType Type,
    decimal? LmeUsdPerMt,
    decimal? PremiumUsdPerMt,
    decimal? FxRate,
    decimal? FreightInrPerMt,
    decimal? DirectRateInrPerKg
) : IRequest<Result<int>>;

public class CreateMaterialCommandValidator : AbstractValidator<CreateMaterialCommand>
{
    public CreateMaterialCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Type).IsInEnum();
        
        When(x => x.Type == MaterialType.Exchange, () =>
        {
            RuleFor(x => x.LmeUsdPerMt).NotEmpty().GreaterThanOrEqualTo(0);
            RuleFor(x => x.PremiumUsdPerMt).NotEmpty().GreaterThanOrEqualTo(0);
            RuleFor(x => x.FxRate).NotEmpty().GreaterThanOrEqualTo(0);
            RuleFor(x => x.FreightInrPerMt).NotEmpty().GreaterThanOrEqualTo(0);
        });

        When(x => x.Type == MaterialType.Direct, () =>
        {
            RuleFor(x => x.DirectRateInrPerKg).NotEmpty().GreaterThanOrEqualTo(0);
        });
    }
}

public class CreateMaterialCommandHandler : IRequestHandler<CreateMaterialCommand, Result<int>>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateMaterialCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<int>> Handle(CreateMaterialCommand request, CancellationToken cancellationToken)
    {
        var repository = _unitOfWork.Repository<Material>();
        var exists = await repository.Query().AnyAsync(x => x.Name == request.Name && x.VendorName == request.VendorName, cancellationToken);
        if (exists)
        {
            return Result<int>.Failure("A material with this name and vendor already exists.");
        }

        var material = new Material
        {
            Name = request.Name,
            VendorName = request.VendorName,
            Type = request.Type,
            LmeUsdPerMt = request.LmeUsdPerMt,
            PremiumUsdPerMt = request.PremiumUsdPerMt,
            FxRate = request.FxRate,
            FreightInrPerMt = request.FreightInrPerMt,
            DirectRateInrPerKg = request.DirectRateInrPerKg,
            AsOnDate = DateTime.UtcNow,
            IsPlaceholder = false
        };

        await repository.AddAsync(material, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<int>.Success(material.Id);
    }
}

// --- UPDATE MATERIAL METADATA ---
public record UpdateMaterialCommand(
    int Id,
    string Name,
    string? VendorName,
    MaterialType Type
) : IRequest<Result>;

public class UpdateMaterialCommandValidator : AbstractValidator<UpdateMaterialCommand>
{
    public UpdateMaterialCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Type).IsInEnum();
    }
}

public class UpdateMaterialCommandHandler : IRequestHandler<UpdateMaterialCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;

    public UpdateMaterialCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(UpdateMaterialCommand request, CancellationToken cancellationToken)
    {
        var repository = _unitOfWork.Repository<Material>();
        var material = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (material == null)
        {
            return Result.Failure("Material not found.");
        }

        var duplicateName = await repository.Query()
            .AnyAsync(x => x.Name == request.Name && x.VendorName == request.VendorName && x.Id != request.Id, cancellationToken);
        if (duplicateName)
        {
            return Result.Failure("Another material with this name and vendor already exists.");
        }

        material.Name = request.Name;
        material.VendorName = request.VendorName;
        material.Type = request.Type;
        material.AsOnDate = DateTime.UtcNow;

        repository.Update(material);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

// --- DELETE MATERIAL ---
public record DeleteMaterialCommand(int Id) : IRequest<Result>;

public class DeleteMaterialCommandHandler : IRequestHandler<DeleteMaterialCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;

    public DeleteMaterialCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteMaterialCommand request, CancellationToken cancellationToken)
    {
        var repository = _unitOfWork.Repository<Material>();
        var material = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (material == null)
        {
            return Result.Failure("Material not found.");
        }

        material.IsDeleted = true; // Soft delete
        repository.Update(material);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

// --- BULK STAMP MATERIAL PRICES ---
public record BulkStampMaterialPricesCommand() : IRequest<Result<int>>;

public class BulkStampMaterialPricesCommandHandler : IRequestHandler<BulkStampMaterialPricesCommand, Result<int>>
{
    private readonly IUnitOfWork _unitOfWork;

    public BulkStampMaterialPricesCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<int>> Handle(BulkStampMaterialPricesCommand request, CancellationToken cancellationToken)
    {
        var repository = _unitOfWork.Repository<Material>();
        
        // Find materials whose AsOnDate is before today
        var today = DateTime.UtcNow.Date;
        var materials = await repository.Query()
            .Where(x => x.AsOnDate.Date < today && !x.IsPlaceholder)
            .ToListAsync(cancellationToken);

        if (!materials.Any())
            return Result<int>.Success(0);

        foreach (var m in materials)
        {
            m.AsOnDate = DateTime.UtcNow;
            repository.Update(m);

            var lme = m.LmeUsdPerMt ?? 0;
            var premium = m.PremiumUsdPerMt ?? 0;
            var fx = m.FxRate ?? 0;
            var freight = m.FreightInrPerMt ?? 0;
            var direct = m.DirectRateInrPerKg ?? 0;

            decimal landedCost = m.Type == Cabcon.Domain.Enums.MaterialType.Exchange
                ? ((lme + premium) * fx + freight) / 1000m
                : direct;

            var history = new MaterialPriceHistory
            {
                MaterialId = m.Id,
                Type = m.Type,
                VendorName = m.VendorName,
                LmeUsdPerMt = m.LmeUsdPerMt,
                PremiumUsdPerMt = m.PremiumUsdPerMt,
                FxRate = m.FxRate,
                FreightInrPerMt = m.FreightInrPerMt,
                DirectRateInrPerKg = m.DirectRateInrPerKg,
                LandedCostInrPerKg = landedCost,
                EffectiveDate = m.AsOnDate,
                CreatedDate = m.AsOnDate,
                CreatedBy = "bulk-stamp"
            };
            
            _unitOfWork.Repository<MaterialPriceHistory>().AddAsync(history, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        
        return Result<int>.Success(materials.Count);
    }
}

// --- BACKFILL MATERIAL PRICES ---
public record BackfillPriceDto(
    DateTime Date,
    decimal? LmeUsdPerMt,
    decimal? PremiumUsdPerMt,
    decimal? FxRate,
    decimal? FreightInrPerMt,
    decimal? DirectRateInrPerKg
);

public record BackfillMaterialPricesCommand(int MaterialId, List<BackfillPriceDto> Prices) : IRequest<Result>;

public class BackfillMaterialPricesCommandHandler : IRequestHandler<BackfillMaterialPricesCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;

    public BackfillMaterialPricesCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(BackfillMaterialPricesCommand request, CancellationToken cancellationToken)
    {
        var repository = _unitOfWork.Repository<Material>();
        var material = await repository.GetByIdAsync(request.MaterialId, cancellationToken);
        if (material == null) return Result.Failure("Material not found.");

        foreach (var price in request.Prices)
        {
            var lme = price.LmeUsdPerMt ?? 0;
            var premium = price.PremiumUsdPerMt ?? 0;
            var fx = price.FxRate ?? 0;
            var freight = price.FreightInrPerMt ?? 0;
            var direct = price.DirectRateInrPerKg ?? 0;

            decimal landedCost = material.Type == Cabcon.Domain.Enums.MaterialType.Exchange
                ? ((lme + premium) * fx + freight) / 1000m
                : direct;

            var history = new MaterialPriceHistory
            {
                MaterialId = material.Id,
                Type = material.Type,
                VendorName = material.VendorName,
                LmeUsdPerMt = price.LmeUsdPerMt,
                PremiumUsdPerMt = price.PremiumUsdPerMt,
                FxRate = price.FxRate,
                FreightInrPerMt = price.FreightInrPerMt,
                DirectRateInrPerKg = price.DirectRateInrPerKg,
                LandedCostInrPerKg = landedCost,
                EffectiveDate = price.Date.Date,
                CreatedDate = DateTime.UtcNow,
                CreatedBy = "backfill"
            };
            
            await _unitOfWork.Repository<MaterialPriceHistory>().AddAsync(history, cancellationToken);
        }

        // Update the material's AsOnDate to the latest date provided (if it's newer than the current AsOnDate)
        var latestDate = request.Prices.Max(x => x.Date).Date;
        if (latestDate > material.AsOnDate.Date)
        {
            material.AsOnDate = latestDate;
            
            // Also update the latest price fields
            var latestPrice = request.Prices.OrderByDescending(x => x.Date).First();
            material.LmeUsdPerMt = latestPrice.LmeUsdPerMt;
            material.PremiumUsdPerMt = latestPrice.PremiumUsdPerMt;
            material.FxRate = latestPrice.FxRate;
            material.FreightInrPerMt = latestPrice.FreightInrPerMt;
            material.DirectRateInrPerKg = latestPrice.DirectRateInrPerKg;
            
            repository.Update(material);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        
        return Result.Success();
    }
}
