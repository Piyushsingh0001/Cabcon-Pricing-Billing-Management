using FluentValidation;

namespace Cabcon.Application.Features.Authentication.Commands.RefreshToken;

public class RefreshTokenCommandValidator : AbstractValidator<RefreshTokenCommand>
{
    public RefreshTokenCommandValidator()
    {
        RuleFor(x => x.RawRefreshToken).NotEmpty();
    }
}
