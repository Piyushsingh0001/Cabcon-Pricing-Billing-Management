using System.Linq.Expressions;
using Cabcon.Domain.Common;
using Cabcon.Domain.Entities.Audit;
using Cabcon.Domain.Entities.Billing;
using Cabcon.Domain.Entities.Identity;
using Cabcon.Domain.Entities.Pricing;
using Cabcon.Domain.Entities.Settings;
using Cabcon.Persistence.Seed;
using Microsoft.EntityFrameworkCore;

namespace Cabcon.Persistence.Context;

public class CabconDbContext : DbContext, Application.Common.Interfaces.IApplicationDbContext
{
    private readonly Application.Common.Interfaces.ICurrentUserService? _currentUser;

    // 1. Keep your existing constructor for runtime use
    public CabconDbContext(
        DbContextOptions<CabconDbContext> options,
        Application.Common.Interfaces.ICurrentUserService? currentUser = null) : base(options)
    {
        _currentUser = currentUser;
    }

    // 2. ADD THIS CONSTRUCTOR specifically for design-time/migrations
    public CabconDbContext(DbContextOptions<CabconDbContext> options) : base(options)
    {
        // Leave empty. EF Core will use this to update the database.
    }


    // Identity
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<EmailVerificationToken> EmailVerificationTokens => Set<EmailVerificationToken>();

    // Audit
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<LoginHistory> LoginHistory => Set<LoginHistory>();
    public DbSet<ApiRequestLog> ApiRequestLogs => Set<ApiRequestLog>();
    public DbSet<ExceptionLog> ExceptionLogs => Set<ExceptionLog>();

    // Pricing (core domain)
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<MaterialPriceHistory> MaterialPriceHistory => Set<MaterialPriceHistory>();
    public DbSet<Sku> Skus => Set<Sku>();
    public DbSet<SkuBomLine> SkuBomLines => Set<SkuBomLine>();

    // Billing
    public DbSet<Quotation> Quotations => Set<Quotation>();
    public DbSet<QuotationLine> QuotationLines => Set<QuotationLine>();
    public DbSet<Customer> Customers => Set<Customer>();

    // Settings
    public DbSet<ApplicationSetting> ApplicationSettings => Set<ApplicationSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CabconDbContext).Assembly);

        // ---- Global soft-delete query filter, applied to every BaseEntity descendant ----
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = Expression.Parameter(entityType.ClrType, "e");
                var property = Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
                var condition = Expression.Lambda(Expression.Equal(property, Expression.Constant(false)), parameter);
                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(condition);
            }
        }

        PricingSeedData.Apply(modelBuilder);
    }

    /// <summary>
    /// Audit-column stamping + true soft-delete interception. Runs on every SaveChanges
    /// so individual command handlers never need to remember to set Created/Updated/
    /// Deleted columns themselves - matches "PART 7: Database Tracking" requirement
    /// that every operation is captured without relying on call-site discipline.
    /// </summary>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var user = _currentUser?.UserName ?? "system";
        var userId = _currentUser?.UserId;

        // ---- 1. Stamp MaterialPriceHistory for any new or modified Material prices ----
        var priceHistories = new List<MaterialPriceHistory>();
        foreach (var entry in ChangeTracker.Entries<Material>())
        {
            if (entry.State == EntityState.Modified)
            {
                var isPriceChanged = entry.Property(m => m.LmeUsdPerMt).IsModified ||
                                     entry.Property(m => m.PremiumUsdPerMt).IsModified ||
                                     entry.Property(m => m.FxRate).IsModified ||
                                     entry.Property(m => m.FreightInrPerMt).IsModified ||
                                     entry.Property(m => m.DirectRateInrPerKg).IsModified;

                if (isPriceChanged)
                {
                    var type = entry.Entity.Type;
                    var lme = entry.Entity.LmeUsdPerMt ?? 0;
                    var premium = entry.Entity.PremiumUsdPerMt ?? 0;
                    var fx = entry.Entity.FxRate ?? 0;
                    var freight = entry.Entity.FreightInrPerMt ?? 0;
                    var direct = entry.Entity.DirectRateInrPerKg ?? 0;

                    decimal landedCost = type == Cabcon.Domain.Enums.MaterialType.Exchange
                        ? ((lme + premium) * fx + freight) / 1000m
                        : direct;

                    priceHistories.Add(new MaterialPriceHistory
                    {
                        MaterialId = entry.Entity.Id,
                        Type = type,
                        VendorName = entry.Entity.VendorName,
                        LmeUsdPerMt = entry.Entity.LmeUsdPerMt,
                        PremiumUsdPerMt = entry.Entity.PremiumUsdPerMt,
                        FxRate = entry.Entity.FxRate,
                        FreightInrPerMt = entry.Entity.FreightInrPerMt,
                        DirectRateInrPerKg = entry.Entity.DirectRateInrPerKg,
                        LandedCostInrPerKg = landedCost,
                        EffectiveDate = now,
                        CreatedDate = now,
                        CreatedBy = user
                    });
                }
            }
            else if (entry.State == EntityState.Added)
            {
                var type = entry.Entity.Type;
                var lme = entry.Entity.LmeUsdPerMt ?? 0;
                var premium = entry.Entity.PremiumUsdPerMt ?? 0;
                var fx = entry.Entity.FxRate ?? 0;
                var freight = entry.Entity.FreightInrPerMt ?? 0;
                var direct = entry.Entity.DirectRateInrPerKg ?? 0;

                decimal landedCost = type == Cabcon.Domain.Enums.MaterialType.Exchange
                    ? ((lme + premium) * fx + freight) / 1000m
                    : direct;

                priceHistories.Add(new MaterialPriceHistory
                {
                    Material = entry.Entity,
                    Type = type,
                    VendorName = entry.Entity.VendorName,
                    LmeUsdPerMt = entry.Entity.LmeUsdPerMt,
                    PremiumUsdPerMt = entry.Entity.PremiumUsdPerMt,
                    FxRate = entry.Entity.FxRate,
                    FreightInrPerMt = entry.Entity.FreightInrPerMt,
                    DirectRateInrPerKg = entry.Entity.DirectRateInrPerKg,
                    LandedCostInrPerKg = landedCost,
                    EffectiveDate = now,
                    CreatedDate = now,
                    CreatedBy = user
                });
            }
        }

        if (priceHistories.Any())
        {
            MaterialPriceHistory.AddRange(priceHistories);
        }

        // ---- 2. Audit-column stamping + true soft-delete interception ----
        foreach (var entry in ChangeTracker.Entries<IAuditable>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedDate = now;
                    entry.Entity.CreatedBy = user;
                    break;

                case EntityState.Modified:
                    entry.Entity.UpdatedDate = now;
                    entry.Entity.UpdatedBy = user;
                    break;

                case EntityState.Deleted:
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.DeletedDate = now;
                    entry.Entity.DeletedBy = user;
                    break;
            }
        }

        // ---- 3. OnBeforeSaveChanges (Prepare Audit Log Entries) ----
        var auditEntries = new List<AuditEntry>();
        ChangeTracker.DetectChanges();

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is AuditLog || entry.Entity is ApiRequestLog || entry.Entity is ExceptionLog || entry.Entity is LoginHistory ||
                entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
            {
                continue;
            }

            var typeName = entry.Entity.GetType().Name;
            // Only audit tracked entities
            if (typeName != "Material" && typeName != "Sku" && typeName != "SkuBomLine" && 
                typeName != "Role" && typeName != "UserRole" && typeName != "RolePermission" && 
                typeName != "User" && typeName != "Quotation" && typeName != "Customer")
            {
                continue;
            }

            var action = entry.State switch
            {
                EntityState.Added => "Create",
                EntityState.Deleted => "Delete",
                EntityState.Modified => "Update",
                _ => "Unknown"
            };

            // Detect soft delete action
            if (entry.State == EntityState.Modified && 
                entry.Properties.Any(p => p.Metadata.Name == "IsDeleted" && (bool?)p.CurrentValue == true && (bool?)p.OriginalValue == false))
            {
                action = "Delete";
            }

            var auditEntry = new AuditEntry(entry)
            {
                UserId = userId,
                UserName = user,
                EntityName = typeName,
                Action = action,
                Module = typeName switch
                {
                    "Material" => "Material",
                    "Sku" => "Product",
                    "SkuBomLine" => "Product",
                    "Role" => "Role",
                    "UserRole" => "Role",
                    "RolePermission" => "Role",
                    "User" => "User",
                    "Quotation" => "Quotation",
                    "Customer" => "Customer",
                    _ => "General"
                }
            };

            auditEntries.Add(auditEntry);

            foreach (var property in entry.Properties)
            {
                if (property.Metadata.IsPrimaryKey())
                {
                    if (property.IsTemporary)
                    {
                        auditEntry.TemporaryProperties.Add(property.Metadata);
                    }
                    else
                    {
                        auditEntry.EntityId = property.CurrentValue?.ToString();
                    }
                    continue;
                }

                switch (entry.State)
                {
                    case EntityState.Added:
                        auditEntry.NewValues[property.Metadata.Name] = property.CurrentValue;
                        break;

                    case EntityState.Deleted:
                        auditEntry.OldValues[property.Metadata.Name] = property.OriginalValue;
                        break;

                    case EntityState.Modified:
                        if (property.IsModified)
                        {
                            auditEntry.OldValues[property.Metadata.Name] = property.OriginalValue;
                            auditEntry.NewValues[property.Metadata.Name] = property.CurrentValue;
                        }
                        break;
                }
            }
        }

        // Save standard changes (which populates DB-generated primary keys)
        var result = await base.SaveChangesAsync(cancellationToken);

        // ---- 4. OnAfterSaveChanges (Complete & Save Audit Logs) ----
        if (auditEntries.Any())
        {
            foreach (var auditEntry in auditEntries)
            {
                foreach (var prop in auditEntry.TemporaryProperties)
                {
                    if (prop.IsPrimaryKey())
                    {
                        auditEntry.EntityId = auditEntry.Entry.Property(prop.Name).CurrentValue?.ToString();
                    }
                    else
                    {
                        auditEntry.NewValues[prop.Name] = auditEntry.Entry.Property(prop.Name).CurrentValue;
                    }
                }

                AuditLogs.Add(auditEntry.ToAuditLog());
            }

            await base.SaveChangesAsync(cancellationToken);
        }

        return result;
    }
}

internal class AuditEntry
{
    public AuditEntry(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry)
    {
        Entry = entry;
    }

    public Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry Entry { get; }
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    public string Module { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public Dictionary<string, object?> OldValues { get; } = new();
    public Dictionary<string, object?> NewValues { get; } = new();
    public List<Microsoft.EntityFrameworkCore.Metadata.IProperty> TemporaryProperties { get; } = new();

    public AuditLog ToAuditLog()
    {
        return new AuditLog
        {
            UserId = UserId,
            UserName = UserName,
            Module = Module,
            Action = Action,
            EntityName = EntityName,
            EntityId = EntityId,
            OldValues = OldValues.Count == 0 ? null : System.Text.Json.JsonSerializer.Serialize(OldValues),
            NewValues = NewValues.Count == 0 ? null : System.Text.Json.JsonSerializer.Serialize(NewValues),
            TimestampUtc = DateTime.UtcNow
        };
    }
}
