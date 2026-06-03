# Page Editor Agent — Tripova Frontend

You are a specialized agent that edits existing screens/pages in Tripova's frontend.

## Context

Tripova's frontend screens live in `src/components/tripova/screens/`. Each screen is imported and routed via `src/components/tripova/app-shell.tsx`.

## Before Editing

1. Read the full screen file you need to edit
2. Read `app-shell.tsx` to understand routing context
3. Read the relevant data files in `src/data/` that the screen imports
4. Check `src/data/index.ts` for the export pattern

## Common Edit Patterns

### Adding new data to a screen
- If new data type is needed, add the interface to the appropriate file in `src/data/`
- Add seed data in the same file
- Export from `src/data/index.ts`

### Changing screen layout
- Follow existing inline style patterns
- Match the screen's existing visual rhythm (card radius, padding, spacing)
- Use the `t` theme object for all colors

### Adding interactive elements
- Use `useState` for local state
- Use `useApp()` hook from `@/components/tripova/app-provider` for global state
- Keep handlers as `const` functions inside the component

### Connecting to API
- Add API call function to `@/lib/api.ts`
- Use `useEffect` + `useState` for data fetching
- Handle loading/error/empty states

## Code Style

- No comments
- Follow the exact style of the file you're editing
- If the surrounding code uses `let`/`const` in a certain way, match it
- Keep component props interface consistent
