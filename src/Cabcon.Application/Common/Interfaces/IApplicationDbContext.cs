using Cabcon.Domain.Entities.Audit;
using Cabcon.Domain.Entities.Identity;
using Cabcon.Domain.Entities.Billing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Application.Common.Interfaces;

/// <summary>
/// Application-layer abstraction over CabconDbContext. The Application layer must
/// never reference Cabcon.Persistence directly (Clean Architecture dependency
/// rule: outer layers depend on inner layers, never the reverse) - this interface
/// is implemented by CabconDbContext itself in Persistence and injected here, so
/// MediatR handlers can query/persist without knowing EF Core is involved at all.
/// Only the DbSets actually queried/mutated by Application handlers are exposed;
/// this keeps the contract narrow and makes unit-testing handlers with an
/// in-memory/fake implementation straightforward.
/// </summary>
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Role> Roles { get; }
    DbSet<Permission> Permissions { get; }
    DbSet<RolePermission> RolePermissions { get; }
    DbSet<UserRole> UserRoles { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<PasswordResetToken> PasswordResetTokens { get; }
    DbSet<EmailVerificationToken> EmailVerificationTokens { get; }
    DbSet<LoginHistory> LoginHistory { get; }
    DbSet<Customer> Customers { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
