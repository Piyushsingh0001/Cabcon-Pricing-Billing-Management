# Cabcon Pricing & Billing Management — Solution Skeleton

Clean Architecture solution skeleton for the enterprise conversion of the
`CabconPricingDashboard.html` reference application.

## Projects

| Project | Layer | Depends on |
|---|---|---|
| `Cabcon.Domain` | Entities, enums, pure domain services (pricing engine) | — |
| `Cabcon.Shared` | Cross-cutting constants/exceptions/Result wrapper | — |
| `Cabcon.Application` | CQRS commands/queries, DTOs, validators, AutoMapper | Domain, Shared |
| `Cabcon.Persistence` | EF Core DbContext, configurations, repositories, migrations | Application, Domain |
| `Cabcon.Infrastructure` | JWT, password hashing, Serilog sinks, PDF/print reporting | Application, Domain |
| `Cabcon.WebApi` | Controllers, middleware, Swagger, composition root | all of the above |
| `Cabcon.Domain.Tests` / `Cabcon.Application.Tests` | xUnit test projects | respective layer |

## What's wired up already

- Solution file referencing all 8 projects with correct project-to-project references
  (dependency direction enforced exactly per the Clean Architecture rule: Domain has
  zero dependencies; Application depends only on Domain+Shared; Persistence/Infrastructure
  depend on Application+Domain; WebApi is the composition root).
- `BaseEntity` / `IAuditable` with the mandated audit columns
  (`CreatedDate/By`, `UpdatedDate/By`, `DeletedDate/By`, `IsDeleted`).
- Domain enums (`MaterialType`, `ConversionType`, `LoadingMode`) mirroring the HTML's
  `material.type` and `sku.convType` values exactly.
- Per-layer `AddXxxServices(...)` DI extension methods (Options Pattern for JWT/connection
  string — nothing hardcoded), composed in `Program.cs`.
- Middleware pipeline stubs in the correct order: GlobalException → RequestResponseLogging →
  Auth(N)/Auth(Z) → AuditTracking, matching the Request Flow documented in Phase 1.
- `appsettings.json` with **your exact connection-string placeholder**
  (`Server=LAPTOP-AQ0HSGQ7\SQLEXPRESS;Database=CabconBillingManagement;...`) — replace the
  server/database name only; nothing else in the app needs to change.
- Swagger configured with JWT Bearer auth support.
- `HealthController` as a smoke-test endpoint.

## What is intentionally NOT yet implemented

Entities, EF configurations/migrations, repositories, MediatR handlers, JWT token
generation, and feature controllers are **not** in this skeleton — they arrive
module-by-module starting with Part 2 (SQL schema) → Part 3 (EF Core) → Part 4 (Auth),
per the project's module-by-module development rule.

## Restoring & running (on your machine — this sandbox has no .NET SDK / NuGet access)

```bash
dotnet restore Cabcon.sln
dotnet build Cabcon.sln
dotnet run --project src/Cabcon.WebApi
```

Then browse to `https://localhost:<port>/swagger` — you should see the Health endpoint.

Before running, edit `src/Cabcon.WebApi/appsettings.json`:
- Set your real SQL Server instance name / database name in `ConnectionStrings:DefaultConnection`.
- Replace `JwtSettings:Secret` with a strong random value (or move it to user-secrets /
  environment variables for non-dev environments — never commit a real secret).

## Next step

Part 2 — full SQL Server schema (tables, PK/FK, indexes, cascade rules, soft-delete,
audit columns) for every entity identified in Phase 1's ERD.

## Part 3 — EF Core Code-First model (added)

Entities (`Cabcon.Domain/Entities/**`): Identity (User/Role/Permission/RolePermission/
UserRole/RefreshToken), Audit (AuditLog/LoginHistory/ApiRequestLog/ExceptionLog),
Pricing (Category/Material/MaterialPriceHistory/Sku/SkuBomLine — the core domain,
1:1 with the HTML's materials/skus/BOM), Billing (Quotation/QuotationLine — frozen
snapshots), Settings (ApplicationSetting).

`PricingCalculationService` (`Cabcon.Domain/Services`) is a pure, side-effect-free
translation of the HTML's `landed / skuRM / skuMfg / effOfferEx` JS functions — the
single source of truth for cost math, usable identically from live read APIs and
quotation generation/recompute.

Fluent API configurations live in `Cabcon.Persistence/Configurations/**` (one file per
entity), applied via `modelBuilder.ApplyConfigurationsFromAssembly(...)`. `CabconDbContext`
adds a global soft-delete query filter to every `BaseEntity` descendant and overrides
`SaveChangesAsync` to auto-stamp `Created/Updated/Deleted (Date/By)` and convert hard
deletes into soft deletes — no command handler needs to remember this itself.

Seed data (`Cabcon.Persistence/Seed/PricingSeedData.cs` + `HasData()` in the Role/
Permission/RolePermission configs) reproduces the HTML's `seedMaterials()`/`seedSkus()`
starting data exactly, plus the three roles (Admin/Manager/User) and a baseline
permission set, so a freshly migrated DB looks identical to the HTML's first load.

### Generating the first migration (run locally — this sandbox has no .NET SDK)

```bash
dotnet tool install --global dotnet-ef   # if not already installed
cd src/Cabcon.WebApi
dotnet ef migrations add InitialCreate --project ../Cabcon.Persistence --startup-project .
dotnet ef database update --project ../Cabcon.Persistence --startup-project .
```

This will create your `CabconBillingManagement` database (per the connection string in
`appsettings.json`) with every table, FK, index, and the seed rows already populated.

### Not yet implemented (next parts)

- `IRepository<T>` / `IUnitOfWork` + concrete repository implementations (Part 6).
- MediatR commands/queries for Materials/Skus/Quotations (Part 6).
- `ICurrentUserService` concrete implementation reading JWT claims (Part 4).
