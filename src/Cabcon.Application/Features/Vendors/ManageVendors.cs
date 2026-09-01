using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Shared.Wrappers;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Vendors;

public record VendorDto(int Id, string Name, bool IsActive);

public record VendorMaterialMappingDto(string MaterialName, List<int> VendorIds, List<string> VendorNames, int MaterialId = 0);

// --- GET ALL VENDORS ---
public record GetVendorsQuery : IRequest<Result<List<VendorDto>>>;

public class GetVendorsQueryHandler : IRequestHandler<GetVendorsQuery, Result<List<VendorDto>>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetVendorsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<List<VendorDto>>> Handle(GetVendorsQuery request, CancellationToken cancellationToken)
    {
        var repo = _unitOfWork.Repository<Vendor>();
        var vendors = await repo.Query()
            .OrderBy(v => v.Name)
            .Select(v => new VendorDto(v.Id, v.Name, !v.IsDeleted))
            .ToListAsync(cancellationToken);

        return Result<List<VendorDto>>.Success(vendors);
    }
}

// --- CREATE VENDOR ---
public record CreateVendorCommand(string Name) : IRequest<Result<VendorDto>>;

public class CreateVendorCommandValidator : AbstractValidator<CreateVendorCommand>
{
    public CreateVendorCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
    }
}

public class CreateVendorCommandHandler : IRequestHandler<CreateVendorCommand, Result<VendorDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateVendorCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<VendorDto>> Handle(CreateVendorCommand request, CancellationToken cancellationToken)
    {
        var trimmedName = request.Name.Trim();
        var repo = _unitOfWork.Repository<Vendor>();
        var existing = await repo.Query()
            .FirstOrDefaultAsync(v => v.Name.ToLower() == trimmedName.ToLower(), cancellationToken);

        if (existing != null)
        {
            if (existing.IsDeleted)
            {
                existing.IsDeleted = false;
                repo.Update(existing);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
            return Result<VendorDto>.Success(new VendorDto(existing.Id, existing.Name, true));
        }

        var vendor = new Vendor { Name = trimmedName };
        await repo.AddAsync(vendor, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<VendorDto>.Success(new VendorDto(vendor.Id, vendor.Name, true));
    }
}

// --- DELETE VENDOR ---
public record DeleteVendorCommand(int Id) : IRequest<Result<bool>>;

public class DeleteVendorCommandHandler : IRequestHandler<DeleteVendorCommand, Result<bool>>
{
    private readonly IUnitOfWork _unitOfWork;

    public DeleteVendorCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<bool>> Handle(DeleteVendorCommand request, CancellationToken cancellationToken)
    {
        var repo = _unitOfWork.Repository<Vendor>();
        var vendor = await repo.GetByIdAsync(request.Id, cancellationToken);
        if (vendor == null)
        {
            return Result<bool>.Failure("Vendor not found.");
        }

        vendor.IsDeleted = true;
        repo.Update(vendor);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}

// --- GET VENDOR MATERIAL MAPPINGS ---
public record GetVendorMaterialMappingsQuery : IRequest<Result<List<VendorMaterialMappingDto>>>;

public class GetVendorMaterialMappingsQueryHandler : IRequestHandler<GetVendorMaterialMappingsQuery, Result<List<VendorMaterialMappingDto>>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetVendorMaterialMappingsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<List<VendorMaterialMappingDto>>> Handle(GetVendorMaterialMappingsQuery request, CancellationToken cancellationToken)
    {
        var repo = _unitOfWork.Repository<MaterialVendor>();
        var mappings = await repo.Query()
            .Include(mv => mv.Material)
            .Include(mv => mv.Vendor)
            .Where(mv => !mv.Vendor.IsDeleted && !mv.Material.IsDeleted)
            .GroupBy(mv => new { mv.MaterialId, mv.Material.Name })
            .Select(g => new VendorMaterialMappingDto(
                g.Key.Name,
                g.Select(x => x.VendorId).ToList(),
                g.Select(x => x.Vendor.Name).ToList(),
                g.Key.MaterialId
            ))
            .ToListAsync(cancellationToken);

        return Result<List<VendorMaterialMappingDto>>.Success(mappings);
    }
}

// --- SAVE VENDOR MATERIAL MAPPINGS ---
public record SaveVendorMaterialMappingsRequestItem(string MaterialName, List<string> VendorNames, int? MaterialId = null);
public record SaveVendorMaterialMappingsCommand(List<SaveVendorMaterialMappingsRequestItem> Mappings) : IRequest<Result<bool>>;

public class SaveVendorMaterialMappingsCommandHandler : IRequestHandler<SaveVendorMaterialMappingsCommand, Result<bool>>
{
    private readonly IUnitOfWork _unitOfWork;

    public SaveVendorMaterialMappingsCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<bool>> Handle(SaveVendorMaterialMappingsCommand request, CancellationToken cancellationToken)
    {
        var matRepo = _unitOfWork.Repository<Material>();
        var vendorRepo = _unitOfWork.Repository<Vendor>();
        var mappingRepo = _unitOfWork.Repository<MaterialVendor>();

        var existingMaterials = await matRepo.Query().ToListAsync(cancellationToken);
        var existingVendors = await vendorRepo.Query().ToListAsync(cancellationToken);
        var existingMappings = await mappingRepo.Query().ToListAsync(cancellationToken);

        foreach (var oldMap in existingMappings)
        {
            mappingRepo.Delete(oldMap);
        }

        foreach (var item in request.Mappings)
        {
            var matName = item.MaterialName.Trim();
            var material = existingMaterials.FirstOrDefault(m => m.Name.Equals(matName, StringComparison.OrdinalIgnoreCase));
            if (material == null)
            {
                material = new Material { Name = matName };
                await matRepo.AddAsync(material, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                existingMaterials.Add(material);
            }

            foreach (var vName in item.VendorNames)
            {
                var trimmedVName = vName.Trim();
                var vendor = existingVendors.FirstOrDefault(v => v.Name.Equals(trimmedVName, StringComparison.OrdinalIgnoreCase));
                if (vendor == null)
                {
                    vendor = new Vendor { Name = trimmedVName };
                    await vendorRepo.AddAsync(vendor, cancellationToken);
                    await _unitOfWork.SaveChangesAsync(cancellationToken);
                    existingVendors.Add(vendor);
                }

                await mappingRepo.AddAsync(new MaterialVendor
                {
                    MaterialId = material.Id,
                    VendorId = vendor.Id
                }, cancellationToken);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }
}
