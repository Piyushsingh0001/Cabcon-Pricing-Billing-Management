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
        var exists = await repository.Query().AnyAsync(x => x.Name == request.Name, cancellationToken);
        if (exists)
        {
            return Result<int>.Failure("A material with this name already exists.");
        }

        var material = new Material
        {
            Name = request.Name,
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
            .AnyAsync(x => x.Name == request.Name && x.Id != request.Id, cancellationToken);
        if (duplicateName)
        {
            return Result.Failure("Another material with this name already exists.");
        }

        material.Name = request.Name;
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
