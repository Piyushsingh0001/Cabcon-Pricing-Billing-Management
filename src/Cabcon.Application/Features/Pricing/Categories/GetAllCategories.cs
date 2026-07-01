using Cabcon.Application.Common.Interfaces;
using Cabcon.Domain.Entities.Pricing;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Features.Pricing.Categories;

public record CategoryDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public record GetAllCategoriesQuery : IRequest<IReadOnlyList<CategoryDto>>;

public class GetAllCategoriesQueryHandler : IRequestHandler<GetAllCategoriesQuery, IReadOnlyList<CategoryDto>>
{
    private readonly IRepository<Category> _repository;

    public GetAllCategoriesQueryHandler(IRepository<Category> repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<CategoryDto>> Handle(GetAllCategoriesQuery request, CancellationToken cancellationToken)
    {
        return await _repository.Query()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name
            })
            .ToListAsync(cancellationToken);
    }
}
