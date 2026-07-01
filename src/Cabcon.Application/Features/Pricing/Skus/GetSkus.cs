using Cabcon.Application.Common.Interfaces;
using Cabcon.Application.Common.Models;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Cabcon.Domain.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Skus;

public record SkuDto
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
    public bool IsPlaceholder { get; init; }
    
    // Computed pricing properties
    public decimal RawMaterialCost { get; init; }
    public decimal ManufacturingCost { get; init; }
    public decimal TotalWeight { get; init; }
}

public record GetSkusQuery : IRequest<PaginatedList<SkuDto>>
{
    public string? Search { get; init; }
    public int? CategoryId { get; init; }
    public string? SortBy { get; init; }
    public bool SortDesc { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 10;
}

public class GetSkusQueryHandler : IRequestHandler<GetSkusQuery, PaginatedList<SkuDto>>
{
    private readonly IRepository<Sku> _skuRepository;
    private readonly PricingCalculationService _pricingService = new();

    public GetSkusQueryHandler(IRepository<Sku> skuRepository)
    {
        _skuRepository = skuRepository;
    }

    public async Task<PaginatedList<SkuDto>> Handle(GetSkusQuery request, CancellationToken cancellationToken)
    {
        var query = _skuRepository.Query()
            .Include(s => s.Category)
            .Include(s => s.BomLines)
                .ThenInclude(b => b.Material)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(search) || 
                                     s.Spec.ToLower().Contains(search) || 
                                     s.Category.Name.ToLower().Contains(search));
        }

        if (request.CategoryId.HasValue)
        {
            query = query.Where(s => s.CategoryId == request.CategoryId.Value);
        }

        // Apply sorting
        if (!string.IsNullOrWhiteSpace(request.SortBy))
        {
            query = request.SortBy.ToLower() switch
            {
                "name" => request.SortDesc ? query.OrderByDescending(s => s.Name) : query.OrderBy(s => s.Name),
                "category" => request.SortDesc ? query.OrderByDescending(s => s.Category.Name) : query.OrderBy(s => s.Category.Name),
                "spec" => request.SortDesc ? query.OrderByDescending(s => s.Spec) : query.OrderBy(s => s.Spec),
                _ => request.SortDesc ? query.OrderByDescending(s => s.Id) : query.OrderBy(s => s.Id)
            };
        }
        else
        {
            query = query.OrderBy(s => s.Category.Name).ThenBy(s => s.Name).ThenBy(s => s.Spec);
        }

        var count = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(s => new SkuDto
        {
            Id = s.Id,
            CategoryId = s.CategoryId,
            CategoryName = s.Category.Name,
            Name = s.Name,
            Spec = s.Spec,
            Unit = s.Unit,
            ConversionType = s.ConversionType,
            ConversionValue = s.ConversionValue,
            GstRate = s.GstRate,
            IsPlaceholder = s.IsPlaceholder,
            RawMaterialCost = _pricingService.RawMaterialCost(s),
            ManufacturingCost = _pricingService.ManufacturingCost(s),
            TotalWeight = _pricingService.TotalBomWeight(s)
        }).ToList();

        return new PaginatedList<SkuDto>(dtos, count, request.PageNumber, request.PageSize);
    }
}
