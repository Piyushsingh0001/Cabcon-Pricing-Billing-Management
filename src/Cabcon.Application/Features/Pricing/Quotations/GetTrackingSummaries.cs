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

public record TrackingSummaryDto
{
    public int QuotationId { get; init; }
    public string QuotationNumber { get; init; } = string.Empty;
    public string PartyName { get; init; } = string.Empty;
    public string CreatedBy { get; init; } = string.Empty;
    public string SentForApprovalBy { get; init; } = string.Empty;
    public string ApprovedBy { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public int? QuotationState { get; init; }
    public System.DateTime CreatedDate { get; init; }
}

public record GetTrackingSummariesQuery() : IRequest<Result<List<TrackingSummaryDto>>>;

public class GetTrackingSummariesQueryHandler : IRequestHandler<GetTrackingSummariesQuery, Result<List<TrackingSummaryDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetTrackingSummariesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<TrackingSummaryDto>>> Handle(GetTrackingSummariesQuery request, CancellationToken cancellationToken)
    {
        var isAdmin = _currentUser.Roles.Contains("Super Admin") || _currentUser.Roles.Contains("Admin");
        
        var query = _context.Quotations
            .Include(q => q.QuotationTrackings)
            .Where(q => q.ApprovalStatus != Cabcon.Domain.Enums.ApprovalStatus.Draft)
            .AsNoTracking();
            
        if (!isAdmin)
        {
            query = query.Where(q => q.CreatedBy == _currentUser.UserName);
        }

        var quotations = await query.OrderByDescending(q => q.CreatedDate).ToListAsync(cancellationToken);
        
        var summaries = quotations.Select(q => 
        {
            var sentTrack = q.QuotationTrackings
                .Where(t => t.Action.Contains("Submitted for Approval"))
                .OrderByDescending(t => t.CreatedDate)
                .FirstOrDefault();
                
            var approveTrack = q.QuotationTrackings
                .Where(t => t.Action == "Approved" || t.Action == "Rejected")
                .OrderByDescending(t => t.CreatedDate)
                .FirstOrDefault();
                
            return new TrackingSummaryDto
            {
                QuotationId = q.Id,
                QuotationNumber = q.QuotationNumber,
                PartyName = q.PartyName,
                CreatedBy = q.CreatedBy,
                SentForApprovalBy = sentTrack?.CreatedBy ?? "-",
                ApprovedBy = approveTrack?.CreatedBy ?? "-",
                Status = q.ApprovalStatus.ToString(),
                QuotationState = (int?)q.QuotationState,
                CreatedDate = q.CreatedDate
            };
        }).ToList();

        return Result<List<TrackingSummaryDto>>.Success(summaries);
    }
}
