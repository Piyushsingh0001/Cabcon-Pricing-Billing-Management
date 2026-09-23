using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Shared.Wrappers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.MaterialTypes;

// --- CREATE MATERIAL TYPE ---
public record CreateMaterialTypeCommand(string Name, string? Description = null) : IRequest<Result<int>>;

public class CreateMaterialTypeCommandValidator : AbstractValidator<CreateMaterialTypeCommand>
{
    public CreateMaterialTypeCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public class CreateMaterialTypeCommandHandler : IRequestHandler<CreateMaterialTypeCommand, Result<int>>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateMaterialTypeCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<int>> Handle(CreateMaterialTypeCommand request, CancellationToken cancellationToken)
    {
        var trimmedName = request.Name.Trim();
        var repository = _unitOfWork.Repository<MaterialType>();

        var exists = await repository.Query()
            .AnyAsync(x => x.Name.ToLower() == trimmedName.ToLower(), cancellationToken);

        if (exists)
        {
            return Result<int>.Failure("A material type with this name already exists.");
        }

        var materialType = new MaterialType
        {
            Name = trimmedName,
            Description = request.Description?.Trim(),
            IsActive = true
        };

        await repository.AddAsync(materialType, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<int>.Success(materialType.Id);
    }
}

// --- UPDATE MATERIAL TYPE ---
public record UpdateMaterialTypeCommand(int Id, string Name, string? Description = null, bool? IsActive = null) : IRequest<Result>;

public class UpdateMaterialTypeCommandValidator : AbstractValidator<UpdateMaterialTypeCommand>
{
    public UpdateMaterialTypeCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public class UpdateMaterialTypeCommandHandler : IRequestHandler<UpdateMaterialTypeCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;

    public UpdateMaterialTypeCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(UpdateMaterialTypeCommand request, CancellationToken cancellationToken)
    {
        var repository = _unitOfWork.Repository<MaterialType>();
        var materialType = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (materialType == null)
        {
            return Result.Failure("Material type not found.");
        }

        var trimmedName = request.Name.Trim();
        var duplicateName = await repository.Query()
            .AnyAsync(x => x.Name.ToLower() == trimmedName.ToLower() && x.Id != request.Id, cancellationToken);

        if (duplicateName)
        {
            return Result.Failure("Another material type with this name already exists.");
        }

        materialType.Name = trimmedName;
        if (request.Description != null)
        {
            materialType.Description = request.Description.Trim();
        }
        if (request.IsActive.HasValue)
        {
            materialType.IsActive = request.IsActive.Value;
        }

        repository.Update(materialType);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

// --- DELETE MATERIAL TYPE ---
public record DeleteMaterialTypeCommand(int Id) : IRequest<Result>;

public class DeleteMaterialTypeCommandHandler : IRequestHandler<DeleteMaterialTypeCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;

    public DeleteMaterialTypeCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteMaterialTypeCommand request, CancellationToken cancellationToken)
    {
        var repository = _unitOfWork.Repository<MaterialType>();
        var materialType = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (materialType == null)
        {
            return Result.Failure("Material type not found.");
        }

        // Check if any materials are associated with this MaterialType
        var materialRepo = _unitOfWork.Repository<Material>();
        var hasMaterials = await materialRepo.Query()
            .AnyAsync(m => m.MaterialTypeId == request.Id, cancellationToken);

        if (hasMaterials)
        {
            return Result.Failure("Cannot delete this material type because one or more raw materials are assigned to it.");
        }

        repository.Delete(materialType);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
