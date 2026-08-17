using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Cabcon.Domain.Services;
using Cabcon.Shared.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Skus;

public record SkuBomLineDto
{
    public int MaterialId { get; init; }
    public string MaterialName { get; init; } = string.Empty;
    public MaterialType MaterialType { get; init; }
    public decimal WeightKg { get; init; }
    public decimal MaterialLandedCost { get; init; }
    public int LineOrder { get; init; }
    public MaterialType PriceType { get; init; }
    public BomPricingMethod PricingMethod { get; init; }
    public BomPricingMonth? PricingMonth { get; init; }
    public decimal? ManualPrice { get; init; }
}

public record SkuDetailsDto
{
    public int Id { get; init; }
    public int CategoryId { get; init; }
    public string CategoryName { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Spec { get; init; } = string.Empty;
    public string Unit { get; init; } = string.Empty;
    public ConversionType ConversionType { get; init; }
    public decimal ConversionValue { get; init; }
    public decimal GstRate { get; init; }
    public decimal Quantity { get; init; } = 1m;
    public bool IsPlaceholder { get; init; }
    public decimal RawMaterialCost { get; init; }
    public decimal ManufacturingCost { get; init; }
    public decimal TotalWeight { get; init; }
    public IReadOnlyList<SkuBomLineDto> BomLines { get; init; } = Array.Empty<SkuBomLineDto>();
}

public record GetSkuDetailsQuery(int Id) : IRequest<SkuDetailsDto>;

public class GetSkuDetailsQueryHandler : IRequestHandler<GetSkuDetailsQuery, SkuDetailsDto>
{
    private readonly IRepository<Sku> _skuRepository;
    private readonly PricingCalculationService _pricingService = new();

    public GetSkuDetailsQueryHandler(IRepository<Sku> skuRepository)
    {
        _skuRepository = skuRepository;
    }

    public async Task<SkuDetailsDto> Handle(GetSkuDetailsQuery request, CancellationToken cancellationToken)
    {
        var sku = await _skuRepository.Query()
            .Include(s => s.Category)
            .Include(s => s.BomLines)
                .ThenInclude(b => b.Material)
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

        if (sku == null)
        {
            throw new NotFoundException(nameof(Sku), request.Id);
        }

        var bomLines = sku.BomLines
            .OrderBy(b => b.LineOrder)
            .Select(b => new SkuBomLineDto
            {
                MaterialId = b.MaterialId,
                MaterialName = b.Material.Name,
                MaterialType = b.Material.Type,
                WeightKg = b.WeightKg,
                MaterialLandedCost = _pricingService.LandedCost(b.Material),
                LineOrder = b.LineOrder,
                PriceType = b.PriceType,
                PricingMethod = b.PricingMethod,
                PricingMonth = b.PricingMonth,
                ManualPrice = b.ManualPrice
            })
            .ToList();

        return new SkuDetailsDto
        {
            Id = sku.Id,
            CategoryId = sku.CategoryId,
            CategoryName = sku.Category.Name,
            Name = sku.Name,
            Spec = sku.Spec,
            Unit = sku.Unit,
            ConversionType = sku.ConversionType,
            ConversionValue = sku.ConversionValue,
            GstRate = sku.GstRate,
            Quantity = sku.Quantity > 0 ? sku.Quantity : 1m,
            IsPlaceholder = sku.IsPlaceholder,
            RawMaterialCost = _pricingService.RawMaterialCost(sku),
            ManufacturingCost = _pricingService.ManufacturingCost(sku),
            TotalWeight = _pricingService.TotalBomWeight(sku),
            BomLines = bomLines
        };
    }
}
