using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Billing;
using Cabcon.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Quotations;

public record ChangeQuotationStateCommand(int Id, QuotationState State) : IRequest<ChangeQuotationStateResponse>;

public record ChangeQuotationStateResponse(bool Success, string Message);

public class ChangeQuotationStateCommandValidator : AbstractValidator<ChangeQuotationStateCommand>
{
    public ChangeQuotationStateCommandValidator()
    {
        RuleFor(v => v.Id).GreaterThan(0);
        RuleFor(v => v.State).IsInEnum();
    }
}

public class ChangeQuotationStateCommandHandler : IRequestHandler<ChangeQuotationStateCommand, ChangeQuotationStateResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ChangeQuotationStateCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<ChangeQuotationStateResponse> Handle(ChangeQuotationStateCommand request, CancellationToken cancellationToken)
    {
        var quote = await _context.Quotations
            .FirstOrDefaultAsync(q => q.Id == request.Id, cancellationToken);

        if (quote == null)
            return new ChangeQuotationStateResponse(false, "Quotation not found.");

        if (quote.QuotationState == QuotationState.Accepted || quote.QuotationState == QuotationState.Rejected)
            return new ChangeQuotationStateResponse(false, "Cannot change state of an Accepted or Rejected quotation.");

        var oldState = quote.QuotationState;
        quote.QuotationState = request.State;

        var userName = _currentUserService.UserName ?? "System";

        _context.QuotationTrackings.Add(new QuotationTracking
        {
            QuotationId = quote.Id,
            QuotationNumber = quote.QuotationNumber,
            Action = "State Changed",
            Details = $"Quotation state changed from {oldState?.ToString() ?? "None"} to {request.State}."
        });

        await _context.SaveChangesAsync(cancellationToken);

        return new ChangeQuotationStateResponse(true, "Quotation state updated successfully.");
    }
}
