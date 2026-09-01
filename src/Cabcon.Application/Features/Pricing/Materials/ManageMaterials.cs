using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Cabcon.Domain.Services;
using Cabcon.Shared.Wrappers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Materials;

// --- CREATE MATERIAL ---
public record CreateMaterialCommand(
    string Name,
    string? VendorName,
    MaterialType? Type,
    decimal? LmeUsdPerMt,
    decimal? PremiumUsdPerMt,
    decimal? FxRate,
    decimal? FreightInrPerKg,
    decimal? FreightInrPerMt,
    decimal? DirectRateInrPerKg
) : IRequest<Result<int>>;

public class CreateMaterialCommandValidator : AbstractValidator<CreateMaterialCommand>
{
    public CreateMaterialCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        
        When(x => x.Type == MaterialType.Exchange, () =>
        {
            RuleFor(x => x.LmeUsdPerMt).GreaterThanOrEqualTo(0);
            RuleFor(x => x.PremiumUsdPerMt).GreaterThanOrEqualTo(0);
            RuleFor(x => x.FxRate).GreaterThanOrEqualTo(0);
        });

        When(x => x.Type == MaterialType.Direct, () =>
        {
            RuleFor(x => x.DirectRateInrPerKg).GreaterThanOrEqualTo(0);
        });
    }
}

public class CreateMaterialCommandHandler : IRequestHandler<CreateMaterialCommand, Result<int>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly PricingCalculationService _pricingService = new();

    public CreateMaterialCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<int>> Handle(CreateMaterialCommand request, CancellationToken cancellationToken)
    {
        var trimmedName = request.Name.Trim();
        var repository = _unitOfWork.Repository<Material>();

        var existingMaterial = await repository.Query()
            .FirstOrDefaultAsync(x => x.Name.ToLower() == trimmedName.ToLower(), cancellationToken);

        Material material;
        if (existingMaterial == null)
        {
            material = new Material
            {
                Name = trimmedName
            };
            await repository.AddAsync(material, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        else
        {
            material = existingMaterial;
        }

        // Check if vendor mapping is supplied
        int? vendorId = null;
        if (!string.IsNullOrWhiteSpace(request.VendorName))
        {
            var vendorRepo = _unitOfWork.Repository<Vendor>();
            var vName = request.VendorName.Trim();
            var vendor = await vendorRepo.Query().FirstOrDefaultAsync(v => v.Name.ToLower() == vName.ToLower(), cancellationToken);
            if (vendor == null)
            {
                vendor = new Vendor { Name = vName };
                await vendorRepo.AddAsync(vendor, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
            vendorId = vendor.Id;

            var mvRepo = _unitOfWork.Repository<MaterialVendor>();
            var mappingExists = await mvRepo.Query()
                .AnyAsync(mv => mv.MaterialId == material.Id && mv.VendorId == vendor.Id, cancellationToken);

            if (!mappingExists)
            {
                await mvRepo.AddAsync(new MaterialVendor
                {
                    MaterialId = material.Id,
                    VendorId = vendor.Id
                }, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
        }

        // Record initial price history snapshot if price parameters are provided
        if (request.Type.HasValue)
        {
            decimal? freightKg = request.FreightInrPerKg;
            if (!freightKg.HasValue && request.FreightInrPerMt.HasValue)
            {
                freightKg = request.FreightInrPerMt.Value / 1000m;
            }

            var landedCost = request.Type == MaterialType.Exchange
                ? _pricingService.LandedCost(MaterialType.Exchange, request.LmeUsdPerMt, request.PremiumUsdPerMt, request.FxRate, freightKg, null)
                : (request.DirectRateInrPerKg ?? 0);

            var history = new MaterialPriceHistory
            {
                MaterialId = material.Id,
                Type = request.Type.Value,
                VendorId = request.Type.Value == MaterialType.Direct ? vendorId : null,
                LmeUsdPerMt = request.LmeUsdPerMt,
                PremiumUsdPerMt = request.PremiumUsdPerMt,
                FxRate = request.FxRate,
                FreightInrPerKg = freightKg,
                DirectRateInrPerKg = request.DirectRateInrPerKg,
                LandedCostInrPerKg = landedCost,
                EffectiveDate = DateTime.UtcNow.Date,
                CreatedDate = DateTime.UtcNow,
                CreatedBy = "material-create"
            };

            await _unitOfWork.Repository<MaterialPriceHistory>().AddAsync(history, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return Result<int>.Success(material.Id);
    }
}

// --- UPDATE MATERIAL METADATA ---
public record UpdateMaterialCommand(
    int Id,
    string Name,
    string? VendorName = null,
    MaterialType? Type = null
) : IRequest<Result>;

public class UpdateMaterialCommandValidator : AbstractValidator<UpdateMaterialCommand>
{
    public UpdateMaterialCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
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

        var trimmedName = request.Name.Trim();
        var duplicateName = await repository.Query()
            .AnyAsync(x => x.Name.ToLower() == trimmedName.ToLower() && x.Id != request.Id, cancellationToken);

        if (duplicateName)
        {
            return Result.Failure("Another material with this name already exists.");
        }

        material.Name = trimmedName;
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
        var historyRepo = _unitOfWork.Repository<MaterialPriceHistory>();
        var today = DateTime.UtcNow.Date;
        var localToday = DateTime.Today;

        // Get latest price histories that haven't been updated today
        var latestHistories = await historyRepo.Query()
            .GroupBy(h => new { h.MaterialId, h.Type, h.VendorId })
            .Select(g => g.OrderByDescending(x => x.EffectiveDate).First())
            .ToListAsync(cancellationToken);

        int count = 0;
        foreach (var h in latestHistories)
        {
            bool hasToday = await historyRepo.Query()
                .AnyAsync(x => x.MaterialId == h.MaterialId 
                            && x.Type == h.Type 
                            && x.VendorId == h.VendorId 
                            && (x.EffectiveDate.Date == today || x.EffectiveDate.Date == localToday), cancellationToken);

            if (!hasToday)
            {
                var newStamp = new MaterialPriceHistory
                {
                    MaterialId = h.MaterialId,
                    Type = h.Type,
                    VendorId = h.VendorId,
                    LmeUsdPerMt = h.LmeUsdPerMt,
                    PremiumUsdPerMt = h.PremiumUsdPerMt,
                    FxRate = h.FxRate,
                    FreightInrPerKg = h.FreightInrPerKg,
                    DirectRateInrPerKg = h.DirectRateInrPerKg,
                    LandedCostInrPerKg = h.LandedCostInrPerKg,
                    EffectiveDate = today,
                    CreatedDate = DateTime.UtcNow,
                    CreatedBy = "bulk-stamp"
                };
                await historyRepo.AddAsync(newStamp, cancellationToken);
                count++;
            }
        }

        if (count > 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        
        return Result<int>.Success(count);
    }
}

// --- BACKFILL MATERIAL PRICES ---
public record BackfillPriceDto(
    DateTime Date,
    string? VendorName,
    decimal? LmeUsdPerMt,
    decimal? PremiumUsdPerMt,
    decimal? FxRate,
    decimal? FreightInrPerKg,
    decimal? FreightInrPerMt,
    decimal? DirectRateInrPerKg,
    MaterialType? Type = null,
    int? VendorId = null
);

public record BackfillMaterialPricesCommand(int MaterialId, List<BackfillPriceDto> Prices) : IRequest<Result>;

public class BackfillMaterialPricesCommandHandler : IRequestHandler<BackfillMaterialPricesCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly PricingCalculationService _pricingService = new();

    public BackfillMaterialPricesCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(BackfillMaterialPricesCommand request, CancellationToken cancellationToken)
    {
        var repository = _unitOfWork.Repository<Material>();
        var material = await repository.GetByIdAsync(request.MaterialId, cancellationToken);
        if (material == null) return Result.Failure("Material not found.");

        var historyRepo = _unitOfWork.Repository<MaterialPriceHistory>();
        var vendorRepo = _unitOfWork.Repository<Vendor>();

        foreach (var price in request.Prices)
        {
            var targetType = price.Type ?? MaterialType.Exchange;
            decimal? freightKg = price.FreightInrPerKg;
            if (!freightKg.HasValue && price.FreightInrPerMt.HasValue)
            {
                freightKg = price.FreightInrPerMt.Value / 1000m;
            }

            int? resolvedVendorId = null;
            if (targetType == MaterialType.Direct)
            {
                resolvedVendorId = price.VendorId;
                if (!resolvedVendorId.HasValue && !string.IsNullOrWhiteSpace(price.VendorName))
                {
                    var trimmedVName = price.VendorName.Trim();
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

            decimal landedCost = targetType == MaterialType.Exchange
                ? _pricingService.LandedCost(MaterialType.Exchange, price.LmeUsdPerMt, price.PremiumUsdPerMt, price.FxRate, freightKg, null)
                : (price.DirectRateInrPerKg ?? 0);

            var history = new MaterialPriceHistory
            {
                MaterialId = material.Id,
                Type = targetType,
                VendorId = targetType == MaterialType.Direct ? resolvedVendorId : null,
                LmeUsdPerMt = price.LmeUsdPerMt,
                PremiumUsdPerMt = price.PremiumUsdPerMt,
                FxRate = price.FxRate,
                FreightInrPerKg = freightKg,
                DirectRateInrPerKg = price.DirectRateInrPerKg,
                LandedCostInrPerKg = landedCost,
                EffectiveDate = price.Date.Date,
                CreatedDate = DateTime.UtcNow,
                CreatedBy = "backfill"
            };
            
            await historyRepo.AddAsync(history, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        
        return Result.Success();
    }
}
