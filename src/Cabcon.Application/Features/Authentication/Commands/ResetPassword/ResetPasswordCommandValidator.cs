using FluentValidation;

namespace Cabcon.Application.Features.Authentication.Commands.ResetPassword;

public class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.RawToken).NotEmpty();
        RuleFor(x => x.NewPassword)
            .NotEmpty();
    }
}
