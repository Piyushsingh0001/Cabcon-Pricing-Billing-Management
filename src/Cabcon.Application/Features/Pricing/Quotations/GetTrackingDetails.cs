using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Billing;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Cabcon.Application.Features.Pricing.Quotations;

public record TrackingLogDto
{
    public string Action { get; init; } = string.Empty;
    public string Details { get; init; } = string.Empty;
    public string PerformedBy { get; init; } = string.Empty;
    public System.DateTime Timestamp { get; init; }
}

public record GetTrackingDetailsQuery(int QuotationId) : IRequest<Result<List<TrackingLogDto>>>;

public class GetTrackingDetailsQueryHandler : IRequestHandler<GetTrackingDetailsQuery, Result<List<TrackingLogDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetTrackingDetailsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<TrackingLogDto>>> Handle(GetTrackingDetailsQuery request, CancellationToken cancellationToken)
    {
        var logs = await _context.QuotationTrackings
            .Where(t => t.QuotationId == request.QuotationId)
            .OrderByDescending(t => t.CreatedDate)
            .Select(t => new TrackingLogDto
            {
                Action = t.Action,
                Details = t.Details,
                PerformedBy = t.CreatedBy,
                Timestamp = t.CreatedDate
            })
            .ToListAsync(cancellationToken);

        return Result<List<TrackingLogDto>>.Success(logs);
    }
}
