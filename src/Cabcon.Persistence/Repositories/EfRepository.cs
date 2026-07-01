using Cabcon.Application.Common.Interfaces;
using Cabcon.Persistence.Context;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Cabcon.Persistence.Repositories;

public class EfRepository<T> : IRepository<T> where T : class
{
    private readonly CabconDbContext _context;
    private readonly DbSet<T> _dbSet;

    public EfRepository(CabconDbContext context)
    {
        _context = context;
        _dbSet = _context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        return await _dbSet.FindAsync(new object[] { id }, ct);
    }

    public async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default)
    {
        return await _dbSet.ToListAsync(ct);
    }

    public IQueryable<T> Query()
    {
        return _dbSet;
    }

    public async Task AddAsync(T entity, CancellationToken ct = default)
    {
        await _dbSet.AddAsync(entity, ct);
    }

    public void Update(T entity)
    {
        if (_context.Entry(entity).State == EntityState.Detached)
        {
            _dbSet.Attach(entity);
            _context.Entry(entity).State = EntityState.Modified;
        }
    }

    public void Delete(T entity)
    {
        _dbSet.Remove(entity);
    }
}
