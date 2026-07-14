# Cabcon Project Development Rules & Guidelines

This configuration root is loaded automatically by the agent before starting any task in this workspace. Always read and adhere to the guidelines documented here.

## General Instructions
* **Maintain Code Quality & Patterns**: All features must strictly follow the patterns laid out in the project. Do not introduce ad-hoc architectures or external state management libraries unless explicitly requested.
* **Preserve Documentation**: Retain all existing docstrings, class comments, and inline annotations unless they are directly invalidated by the changes.
* **Keep Diffs Minimal**: Modify only what is required to achieve the task. Avoid formatting or refactoring files that are outside the scope of the request.

## Backend Architecture Guidelines
When developing backend APIs, commands, queries, entities, or database integrations:
1. Refer to and strictly follow [BACKEND_ARCHITECTURE.md](file:///c:/CabconRespo/.agents/BACKEND_ARCHITECTURE.md).
2. Adhere to **Clean Architecture** patterns, placing core logic in Domain and database access in Persistence.
3. Express logic via **CQRS / MediatR** feature files (`Command`, `Query`, `Handler`, and `Validator` in the same directory).
4. Perform state mutations securely using generic repositories via `IUnitOfWork` and commit transactions using `SaveChangesAsync`.
5. Support soft deletion using `IsActive` or `IsDeleted` attributes to maintain historical audit validity.

## Frontend Design & Uniformity Guidelines
When creating or modifying Angular client features, layouts, templates, or styles:
1. Refer to and strictly follow [FRONTEND_DESIGN_SYSTEM.md](file:///c:/CabconRespo/.agents/FRONTEND_DESIGN_SYSTEM.md).
2. Always style elements using the HSL design tokens and CSS variables declared in [theme.scss](file:///c:/CabconRespo/client/src/theme.scss) (e.g., `var(--primary-color)`, `var(--bg-primary)`, `var(--border-glass)`).
3. Use `'Inter'` font family, matching weight variables (`400`/`500`/`600`/`700`).
4. Ensure spacing uniformity: use `animated-view` container wrapper fade-ins, consistent padding, and `12px` rounded glassmorphism card panels (`.glass-card`).
5. Use Material Icons wrapped in icon-buttons with native HTML hover tooltip `title` descriptions for row grid triggers (e.g., `edit`, `delete`, `visibility`).
6. Apply `.inactive-row` CSS class (`line-through` and `opacity: 0.65`) for soft-deleted, disabled, or expired elements in grid tables.
7. Use the standalone `ConfirmDialogComponent` popup modal sequence for all deletion warnings or action confirmations.
