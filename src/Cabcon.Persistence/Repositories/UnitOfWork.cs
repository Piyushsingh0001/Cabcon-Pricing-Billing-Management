using Cabcon.Application.Common.Interfaces;
using Cabcon.Persistence.Context;
using System.Collections.Concurrent;

namespace Cabcon.Persistence.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly CabconDbContext _context;
    private readonly ConcurrentDictionary<Type, object> _repositories = new();

    public UnitOfWork(CabconDbContext context)
    {
        _context = context;
    }

    public IRepository<T> Repository<T>() where T : class
    {
        return (IRepository<T>)_repositories.GetOrAdd(typeof(T), _ => new EfRepository<T>(_context));
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        return await _context.SaveChangesAsync(ct);
    }

    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }
}
