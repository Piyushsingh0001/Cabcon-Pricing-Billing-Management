# Cabcon Frontend Design System & UI Uniformity Guidelines

This document details the UI design system, color palettes, fonts, spacing, margins, layouts, and component standards for the Cabcon Angular client application. All future frontend modifications, stylesheet styling, and components MUST strictly follow these specifications to maintain visual uniformity and a premium, responsive look.

---

## 1. Color Palette & Typography Tokens

All styling must reference the CSS variables defined in [theme.scss](file:///c:/CabconRespo/client/src/theme.scss) rather than using hardcoded hex codes:

### A. Design Tokens
* **Primary Theme Background**: `var(--bg-primary)` (`#F5F7FA`) - applied globally on the html/body background.
* **Secondary/Card Background**: `var(--bg-secondary)` / `var(--bg-card)` (`#ffffff`) - used for structural blocks, grids, and dashboard panels.
* **Border Lines**: `var(--border-glass)` (`#E5E7EB`) - standard thin border color separating grid cells, cards, and inputs.
* **Primary Brand Navy**: `var(--primary-color)` (`#101D32`) - used for headers, labels, primary buttons, and selected states.
* **Accent Brand Red**: `var(--accent-color)` (`#D62828`) - used for warnings, deletes, and critical errors.
* **Primary Gradient**: `var(--primary-gradient)` (`linear-gradient(135deg, #101D32 0%, #1c3256 100%)`) - applied to premium hover states of primary buttons.
* **Secondary Gradient**: `var(--secondary-gradient)` (`linear-gradient(135deg, #D62828 0%, #b81d1d 100%)`) - applied to hover states of secondary/action buttons.
* **Text Grays**:
  - Primary Text: `var(--text-primary)` (`#101D32`)
  - Secondary/Subtitle Text: `var(--text-secondary)` (`#6B7280`)
  - Muted/Disabled Labels: `var(--text-muted)` (`#9ca3af`)

### B. Typography
* **Global Font Family**: `'Inter', sans-serif` - loaded via Google Fonts link inside [styles.scss](file:///c:/CabconRespo/client/src/styles.scss).
* **Font Weights**:
  - Regular Text: `400`
  - Medium/Labels: `500`
  - Semi-Bold/Data Headers: `600`
  - Bold Titles/Primary Values: `700`

---

## 2. Layout, Margin & Spacing Rules

* **Page Containers**: Every major page layout wrapper must have `animated-view` applied:
  - Fade-in animation class defined in [styles.scss](file:///c:/CabconRespo/client/src/styles.scss).
  - Page container class (e.g., `.materials-container`, `.skus-container`, `.quotations-container`) must use:
    ```scss
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px;
    ```
* **Margins**:
  - Separation between header section and grid: `margin-bottom: 24px`
  - Separation between cards: `gap: 16px` or `margin-bottom: 16px`
* **Card Container Style**:
  - Always use the `.glass-card` class for a premium container look:
    ```scss
    background: var(--bg-card);
    border: 1px solid var(--border-glass);
    border-radius: 12px;
    box-shadow: var(--shadow-premium);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    ```

---

## 3. UI Component Specifications

### A. Tables
* Standard custom table styling applies to `<table class="tbl">`:
  - Collapse borders: `border-collapse: collapse`
  - Table headers `th` style:
    ```scss
    background: #f8fafc;
    color: var(--text-primary);
    font-weight: 600;
    border-bottom: 2px solid var(--border-glass);
    font-size: 13px;
    padding: 12px;
    ```
  - Table cells `td` style:
    ```scss
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-glass);
    padding: 12px;
    font-size: 13px;
    ```
  - Row Hover: Apply a light gray backdrop highlight (`#f1f5f9`) when rows are hovered.

### B. Action Icons & Tooltips
To keep the dashboard compact and elegant:
* **Text links are forbidden** for critical operations. Use **Material Icons** wrapped in buttons.
* **Tooltips**: Every icon button must have a clear hover tooltip. Use the standard HTML `title` attribute for cross-platform compatibility:
  - Edit: `<button mat-icon-button class="row-icon-btn edit-btn" title="Edit Product"><mat-icon>edit</mat-icon></button>`
  - Delete: `<button mat-icon-button class="row-icon-btn delete-btn" title="Delete Product"><mat-icon>delete</mat-icon></button>`
  - View Details: `<button mat-icon-button class="row-icon-btn view-btn" title="View Quotation"><mat-icon>visibility</mat-icon></button>`
* **Styling buttons**: Override default Material buttons to provide circular backdrop hovers on hover (e.g. `background-color: rgba(16, 29, 50, 0.08)` for primary-colored edit/view, and `rgba(239, 68, 68, 0.08)` for deletes).

### C. Forms & Input Fields
* Standalone forms in custom dialogs (e.g. `SkuEditDialog`) must use semantic custom inputs (`sel`, `in`, `form-row`) styled with a clean slate border to match the reference look, rather than verbose `<mat-form-field>` overlay boxes:
  - Input fields: `.in { border: 1px solid var(--border-glass); border-radius: 4px; padding: 6px 12px; font-size: 13px; background: #ffffff; outline: none; }`
  - Focus state: `.in:focus { border-color: var(--primary-color); }`
  - Badges/Tags: Display sample badges using small colored text blocks with slightly rounded borders (e.g., red backgrounds for deleted status, green for approved, orange for pending).

### D. Dialogs & Modals
* Always use `MatDialog.open(ConfirmDialogComponent)` for all confirmation check workflows (Warnings, Errors, Info, or Deletion triggers) dynamically setting titles, Cancel/Confirm button texts, and warning layouts.
* Expired or disabled rows: Apply `line-through` formatting on cell data and dim the table row's opacity to `0.65` using `.inactive-row` to signal deletion or invalid states, while maintaining list integrity.
