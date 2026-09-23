using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Shared.Wrappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.MaterialTypes;

public record MaterialTypeDto(int Id, string Name, string? Description, string? ColorCode, bool IsActive);

public record GetAllMaterialTypesQuery : IRequest<Result<List<MaterialTypeDto>>>;

public class GetAllMaterialTypesQueryHandler : IRequestHandler<GetAllMaterialTypesQuery, Result<List<MaterialTypeDto>>>
{
    private readonly IRepository<MaterialType> _repository;

    public GetAllMaterialTypesQueryHandler(IRepository<MaterialType> repository)
    {
        _repository = repository;
    }

    public async Task<Result<List<MaterialTypeDto>>> Handle(GetAllMaterialTypesQuery request, CancellationToken cancellationToken)
    {
        var types = await _repository.Query()
            .OrderBy(t => t.Id)
            .Select(t => new MaterialTypeDto(t.Id, t.Name, t.Description, t.ColorCode, t.IsActive))
            .ToListAsync(cancellationToken);

        return Result<List<MaterialTypeDto>>.Success(types);
    }
}
