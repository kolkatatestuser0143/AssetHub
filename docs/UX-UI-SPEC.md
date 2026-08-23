# AssetHub UX/UI Specification

## Design principles

AssetHub uses a shared component system across Tenant and System consoles. Visual differences should come from theme variables and context, not duplicated component implementations.

## Shared components

Core controls include:

- Button
- FormField
- FormSelect
- FormTextarea
- PasswordInput
- Modal
- ConfirmDialog
- LoadingSkeleton/shared LoadingState
- EmptyState
- ErrorState
- Toast/notification UI

## Forms

All standard text, email, password, date, select and textarea controls should use shared components whenever a semantic shared component exists.

Inputs must preserve caret/focus while typing. Modal focus management must initialize on open and must not refocus fields on every render.

## Passwords

Every password entry surface uses the shared `PasswordInput` with a visible eye toggle and accessible labeling.

## Buttons

Buttons inside forms must use an explicit `type="submit"` when they submit the form. Shared Button defaults to a non-submit button to avoid accidental form submission.

Mutation buttons must show a loading/disabled state and prevent double submission.

## Loading

Data loading uses the shared skeleton system. Page-level and route-level loading should be visually consistent and centered within the active content area.

Button-level action spinners are allowed for mutations such as Save, Refresh, Export and Reset; they are not substitutes for page data skeletons.

## Search and filters

Network-backed search/filter changes use a short debounce. Local-only filtering should remain immediate. Search controls must provide clear state and a reset/clear action where appropriate.

## Dialogs

Destructive actions use `ConfirmDialog`, not browser-native `window.confirm`.

## Themes

Tenant console colors are driven by the tenant's licensed theme. System Admin has its own platform theme. Shared components must use CSS variables such as `--theme-primary`, `--theme-link`, `--theme-primary-soft` and focus variables.

## Motion

Micro-animation should reinforce interaction without delaying the task. Respect reduced-motion preferences and avoid animation on critical text/input feedback.

## Accessibility

Interactive controls require visible focus, keyboard operability, readable labels and sufficient state feedback. Icon-only controls must provide accessible names/tooltips where appropriate.
