---
trigger: always_on
---

# 始终用中文回复！！！

# Project Rules and Lessons Learned

## Authentication State Management
- **Rule**: `App.tsx` MUST use the `useAuth` hook, NOT `useAuthStore` directly.
- **Reason**: The `useAuth` hook contains critical side effects for initializing the session (calling `supabase.auth.getSession()` and setting `loading` to false). `useAuthStore` is merely a state container and does not perform initialization.
- **Consequence**: Using `useAuthStore` directly results in `authLoading` remaining `true` indefinitely, causing the application to get stuck in the "Loading..." state.

## State Management General
- **Rule**: Always verify if a hook wrapping a store provides necessary initialization logic before replacing it with direct store access.
- **Context**: Refactoring often tempts to simplify imports, but hooks like `useAuth` or `useAppStore` (if it controls init) often bridge the gap between pure state and side effects.

## UI/UX
- **Rule**: Ensure the "Loading" state has a timeout or error boundary if possible, though correctly initializing state is the primary fix.
- **Rule**: Authentication loading state should block the main UI but must resolve quickly; ensure checking session happens exactly once on mount.

## Refactoring Checklist
1. [ ] Check if the component being refactored relies on side effects from custom hooks.
2. [ ] Verify that authentication state (`loading`, `user`, `session`) is being driven by the correct provider/hook.
3. [ ] If extracting logic to stores, ensure the initialization logic (e.g., `useEffect` calls) is preserved in a top-level component or a dedicated initialization hook.