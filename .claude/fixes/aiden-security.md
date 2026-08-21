# @upstart13-com/aiden-security Fixes

- **[2026-08-21]** The `defineAbilities` example in the SDK's own docstring — and the commented-out block shipped in `src/lib/abilities.ts` — does not compile under `strict`
  - **Symptom**: pasting the documented predicate rule verbatim fails `npx tsc --noEmit`:

    ```
    error TS2322: Type '(session: SecuritySession, post: { userId: string; }) => boolean'
      is not assignable to type 'AbilityRule<unknown> | AbilityRule<unknown>[]'.
      Type '(session: SecuritySession, post: { userId: string; }) => boolean'
        is not assignable to type 'AbilityPredicate<unknown>'.
        Types of parameters 'post' and 'resource' are incompatible.
          Type 'unknown' is not assignable to type '{ userId: string; }'.
    ```

    Reproduced against `@upstart13-com/aiden-security@2.0.1` with the exact snippet from the package's `defineAbilities` JSDoc:

    ```ts
    defineAbilities({
      rules: {
        "post.delete": (session, post: { userId: string }) =>
          post.userId === session.user.id,
      },
    });
    ```

  - **Wrong approach**: typing the rule as `AbilityPredicate<MyResource>` and assigning it into the rules map. It fails for the same reason — the narrowing is on the parameter, which is the contravariant position.
  - **Root cause**: `AbilityPredicate<TResource = unknown>` is a *type alias for a function type*, so `strictFunctionTypes` (implied by `strict: true`) checks its parameters contravariantly. `AbilitiesConfig.rules` is `Record<string, AbilityRule | AbilityRule[]>`, and `AbilityRule` defaults to `AbilityRule<unknown>`. For a predicate narrowed to a concrete resource to be assignable, `unknown` would have to be assignable to that resource type — it is not. The rules map is not generic over the resource, so there is no way to thread the concrete type through.
  - **Fix**: keep the predicate's resource parameter as `unknown` and narrow at runtime. See `activeRole()` in `src/lib/abilities.ts`:

    ```ts
    function activeRole(resource: unknown): OrgRole | null {
      if (typeof resource !== "object" || resource === null) return null;
      const role = (resource as { role?: unknown }).role;
      if (typeof role !== "string") return null;
      return (ORG_ROLES as readonly string[]).includes(role) ? (role as OrgRole) : null;
    }
    ```

  - **Prevention**: structurally prevented in this app — every org-scoped rule is built by the single `orgRole(...)` factory, which returns `AbilityPredicate` (resource `unknown`), so the unsound shape cannot be written by accident. The runtime check is also strictly safer than a cast would have been: `AbilityPredicate`'s resource parameter is *optional*, so `assertCan(abilities, session, action)` called without a resource passes `undefined`, and a cast-based predicate would have dereferenced it. Failing closed is the correct default for an authorization rule.
  - **Upstream**: the docstring example and the starter's commented block should be corrected, or `AbilitiesConfig` should be made generic over the resource type so the documented form type-checks. Worth raising against `aiden-security` rather than patching locally.
