using Cabcon.Application.Common.Interfaces;
using Cabcon.Application.Common.Models;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Enums;
using Cabcon.Domain.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Materials;

public record MaterialDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public MaterialType Type { get; init; }
    public decimal? LmeUsdPerMt { get; init; }
    public decimal? PremiumUsdPerMt { get; init; }
    public decimal? FxRate { get; init; }
    public decimal? FreightInrPerMt { get; init; }
    public decimal? DirectRateInrPerKg { get; init; }
    public DateTime AsOnDate { get; init; }
    public bool IsPlaceholder { get; init; }
    public decimal LandedCost { get; init; }
    public string? UpdatedBy { get; init; }
}

public record GetMaterialsQuery : IRequest<PaginatedList<MaterialDto>>
{
    public string? Search { get; init; }
    public MaterialType? Type { get; init; }
    public string? SortBy { get; init; }
    public bool SortDesc { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 10;
}

public class GetMaterialsQueryHandler : IRequestHandler<GetMaterialsQuery, PaginatedList<MaterialDto>>
{
    private readonly IRepository<Material> _repository;
    private readonly PricingCalculationService _pricingService = new();

    public GetMaterialsQueryHandler(IRepository<Material> repository)
    {
        _repository = repository;
    }

    public async Task<PaginatedList<MaterialDto>> Handle(GetMaterialsQuery request, CancellationToken cancellationToken)
    {
        var query = _repository.Query();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(m => m.Name.ToLower().Contains(search));
        }

        if (request.Type.HasValue)
        {
            query = query.Where(m => m.Type == request.Type.Value);
        }

        // Apply sorting
        if (!string.IsNullOrWhiteSpace(request.SortBy))
        {
            query = request.SortBy.ToLower() switch
            {
                "name" => request.SortDesc ? query.OrderByDescending(m => m.Name) : query.OrderBy(m => m.Name),
                "type" => request.SortDesc ? query.OrderByDescending(m => m.Type) : query.OrderBy(m => m.Type),
                "asondate" => request.SortDesc ? query.OrderByDescending(m => m.AsOnDate) : query.OrderBy(m => m.AsOnDate),
                _ => request.SortDesc ? query.OrderByDescending(m => m.Id) : query.OrderBy(m => m.Id)
            };
        }
        else
        {
            query = query.OrderBy(m => m.Name);
        }

        var count = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(m => new MaterialDto
        {
            Id = m.Id,
            Name = m.Name,
            Type = m.Type,
            LmeUsdPerMt = m.LmeUsdPerMt,
            PremiumUsdPerMt = m.PremiumUsdPerMt,
            FxRate = m.FxRate,
            FreightInrPerMt = m.FreightInrPerMt,
            DirectRateInrPerKg = m.DirectRateInrPerKg,
            AsOnDate = m.AsOnDate,
            IsPlaceholder = m.IsPlaceholder,
            LandedCost = _pricingService.LandedCost(m),
            UpdatedBy = m.UpdatedBy ?? m.CreatedBy
        }).ToList();

        return new PaginatedList<MaterialDto>(dtos, count, request.PageNumber, request.PageSize);
    }
}
