# Cabcon Pricing & Billing Management

Cabcon Pricing & Billing Management is an enterprise-grade web application tailored for dynamic pricing, SKU configuration, and quotation generation. The project uses a **Clean Architecture .NET 9 Web API** backend and a modern **Angular 18** frontend featuring glassmorphism and animated interfaces.

## Project Structure & Architecture

The backend is strictly divided into functional layers to ensure separation of concerns:

| Project | Layer | Responsibility |
|---|---|---|
| `Cabcon.Domain` | Core | Entities, Enums, Pure domain logic, Pricing calculations (`PricingCalculationService`). Has no external dependencies. |
| `Cabcon.Shared` | Common | Cross-cutting constants, permissions, and Result wrappers. |
| `Cabcon.Application` | Application | CQRS commands/queries using MediatR, DTOs, AutoMapper, FluentValidation. |
| `Cabcon.Persistence` | Infrastructure | EF Core `CabconDbContext`, Entity Configurations, Repositories, Data Seeding, and EF Migrations. |
| `Cabcon.Infrastructure` | Infrastructure | JWT Token Generation, Authentication services, CurrentUser extraction, and PDF rendering tools. |
| `Cabcon.WebApi` | Presentation | REST API Controllers, Middleware (Exception handling, Logging, Auth), Swagger, and Dependency Injection composition root. |
| `Cabcon.Client` | Frontend | Angular 18 Single Page Application. Features dynamic pricing dashboards, tracking timelines, robust state management, and modern CSS glassmorphism UI. |

## Key Features

- **Dynamic Material Pricing**: Real-time material pricing updates, historical trends, LME/Premium/FX rate components, and backfilling missing rates.
- **SKU & BOM Management**: Define SKUs with layered Bill of Materials (BOM), configurable manufacturing costs, and real-time margin calculations.
- **Quotation Engine**: Generate highly customized quotations using real-time pricing data. Offers multiple calculation modes (Percentage, Fixed Amount, Itemised, Raw Cost).
- **Quotation Tracking & State Management**: Track approvals, status changes, and state transitions (e.g., *Sent to Customer*, *Accepted*, *Rejected*, *Request for Modification*).
- **PDF Generation**: Instantly render professional PDF outputs of approved quotations.
- **Role-Based Access Control (RBAC)**: Secure access configured for `Admin`, `Manager`, and `User` roles using JWT authentication and custom Permission checks.

## Technology Stack

- **Backend**: .NET 9, C#, ASP.NET Core Web API, Entity Framework Core, SQL Server, MediatR, AutoMapper, FluentValidation, Serilog.
- **Frontend**: Angular 18, TypeScript, RxJS, Angular Material, SCSS (Custom Glassmorphism UI), Chart.js.

## Running the Application Locally

### 1. Database Setup
Ensure you have SQL Server (e.g., SQLEXPRESS) installed and running.
Edit the connection string in `src/Cabcon.WebApi/appsettings.json` to match your local SQL Server instance:
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=YOUR_SERVER_NAME;Database=CabconBillingManagement;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
}
```

### 2. Run Backend
Run the Web API from the CLI:
```bash
cd src/Cabcon.WebApi
dotnet restore
dotnet build
dotnet run
```
*The API will typically start on `https://localhost:55027` and you can browse the Swagger UI at `https://localhost:55027/swagger`.*
*(Note: Entity Framework Migrations and seed data are automatically applied on startup if configured, otherwise run `dotnet ef database update --project ../Cabcon.Persistence`)*

### 3. Run Frontend
In a new terminal window, navigate to the client folder, install dependencies, and start the Angular dev server:
```bash
cd client
npm install
npm start
```
*The Angular app will run on `http://localhost:4200`.*

### Default Credentials
Upon the first run, the database is seeded with a default Admin user:
- **Username**: `****`
- **Password**: `******`

## Development Guidelines

- **CQRS Pattern**: All incoming HTTP requests to the Web API must map to a MediatR `IRequest` (Command or Query) to keep controllers thin.
- **Database Access**: No direct DB context access in the API controllers. Use the injected `ISender` (MediatR) to execute application layer handlers which interact with the `IUnitOfWork`.
- **UI System**: The frontend uses predefined CSS variables in `theme.scss` (e.g., `var(--primary-color)`) and heavily leverages `.glass-card` and `.animated-view` container wrapper fade-ins.
- **Audit Logs**: The database automatically soft-deletes and tracks `CreatedBy`, `CreatedDate`, `LastModifiedBy`, `LastModifiedDate` using EF Core interceptors via `BaseEntity`.
**Copyright © 2026 Piyush Singh**
**Project: Cabcon Pricing & Billing Management**