# Cabcon Backend Architecture & Pattern Guidelines

This document details the architectural layers, design patterns, and programming standards of the Cabcon Pricing & Billing Management backend. All future backend modifications and new feature additions MUST strictly follow these guidelines to ensure consistency, safety, and maintainability.

---

## 1. Architectural Style: Clean/Onion Architecture
The backend is structured into five distinct projects that enforce dependency isolation:
* **Cabcon.Domain (Core)**: Represents the enterprise business rules and domain logic. Contains entity models, enums, value objects, and domain-specific calculation services. Has **zero dependencies** on external libraries, frameworks, or database technologies.
* **Cabcon.Shared**: Contains common components, exceptions, wrappers (like `Result<T>`), wrappers, and global constants.
* **Cabcon.Application (Core Logic)**: Expresses the application business rules. Holds DTO models, interfaces, validation rules (FluentValidation), and CQRS handlers (MediatR). Depends only on `Domain` and `Shared`.
* **Cabcon.Infrastructure**: Implements cross-cutting concerns such as email notifications, security token generation, and encryption.
* **Cabcon.Persistence**: Implements database repository patterns using Entity Framework Core (EF Core), configurations, and migrations.
* **Cabcon.WebApi (Presentation)**: Exposes REST API endpoints, handles authentication/authorization, and maps controllers to MediatR commands/queries.

---

## 2. Design Patterns & Implementation Rules

### A. CQRS with MediatR
All operations (reads/writes) must be implemented using Command Query Responsibility Segregation (CQRS) via MediatR:
* **Queries (Reads)**: Used to fetch data. They must never modify the database. Return DTO types prefixed/suffixed with `Query` and `Dto`.
* **Commands (Writes)**: Used to modify state. Return a success/failure wrapped payload.
* **File Naming & Co-location**: Queries and Commands must be co-located within logical feature directories inside `Cabcon.Application/Features/Pricing/` or `Cabcon.Application/Features/Billing/`.
* **Structure Example**:
  ```csharp
  // Query
  public record GetMyFeatureQuery(int Id) : IRequest<MyFeatureDto>;
  public class GetMyFeatureQueryHandler : IRequestHandler<GetMyFeatureQuery, MyFeatureDto> { ... }
  ```

### B. Repository & Unit of Work Patterns
Direct interactions with `DbContext` are forbidden in the Application layer.
* **Accessing Data**: Inject `IUnitOfWork` to obtain repository instances.
* **Repository Operations**:
  - Use `quotationRepo.GetByIdAsync()` to load individual entities.
  - Use `quotationRepo.Query()` (which returns `IQueryable<T>`) for complex querying, projection, filtering, and `.Include()` relationship loads.
  - Call `_unitOfWork.SaveChangesAsync(cancellationToken)` explicitly to save database changes.
* **Structure Example**:
  ```csharp
  var quotationRepo = _unitOfWork.Repository<Quotation>();
  var entity = await quotationRepo.GetByIdAsync(id, ct);
  entity.IsActive = false;
  quotationRepo.Update(entity);
  await _unitOfWork.SaveChangesAsync(ct);
  ```

### C. Validation (FluentValidation)
* Every command changing state must have an associated `AbstractValidator<TCommand>` declared in the same feature file.
* Validate all ranges, non-empty properties, string maximum lengths, and foreign keys.
* Validation is automatically triggered in the MediatR pipeline via `ValidationBehaviour`.

### D. Auditable Entities & Soft Delete
* Every database entity should inherit from `BaseEntity` (defined in `Cabcon.Domain.Common`).
* **Audit Fields**: `CreatedDate`, `CreatedBy`, `UpdatedDate`, `UpdatedBy` are stamped automatically by EF Core interceptors on database save.
* **Soft Deletes**:
  - Entities that must be soft-deleted should have an `IsActive` or `IsDeleted` property.
  - Implement a logical delete by setting `IsActive = false` (or `IsDeleted = true`), keeping the row in the table for history auditing.
  - Map audit fields (`x.UpdatedBy ?? x.CreatedBy`) back to API queries to render "Last Updated by" values in grids.

---

## 3. Database Migration Guidelines
When changing entities, running EF Core database migrations is mandatory:
* Project: `src/Cabcon.Persistence`
* Startup Project: `src/Cabcon.WebApi`
* **Commands**:
  - Add: `dotnet ef migrations add <Name> --project src/Cabcon.Persistence --startup-project src/Cabcon.WebApi`
  - Apply: `dotnet ef database update --project src/Cabcon.Persistence --startup-project src/Cabcon.WebApi`
  - Remove last: `dotnet ef migrations remove --project src/Cabcon.Persistence --startup-project src/Cabcon.WebApi`
