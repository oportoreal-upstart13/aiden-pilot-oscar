# Migrating to Smithers DS

If your project was forked from `u13-ai-foundation` **before** the AIDEN-1 design-system overhaul, this guide brings you in line. New projects scaffolded after the overhaul inherit the new system automatically — no action required.

## What changed

| Area                  | Before                                                            | After (Smithers DS)                                                      |
| --------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Brand color           | Electric blue `#2266FF`                                           | Violet `#7C3AED` (with `#5B3DF5` brand accent)                           |
| Surfaces              | Near-black / white / `#EFEFEF` muted                              | Violet primary on neutral-gray scale                                     |
| Sans font             | Geist                                                             | Inter                                                                    |
| Mono font             | Geist Mono                                                        | JetBrains Mono                                                           |
| Radius default        | `--radius` 6px (`rounded-sm` = 2px)                               | `--radius` 4px (`rounded-sm` = 4px)                                      |
| Card radius           | `rounded-sm` (2px)                                                | `rounded-xl` (12px)                                                      |
| Semantic tokens       | Only `--destructive`                                              | `success`, `warning`, `destructive`, `info` (each with `*-soft` variant) |
| Active nav item       | Inverted (`bg-foreground text-background`)                        | Violet pill (`bg-sidebar-accent`)                                        |
| Badge variants        | `default`, `secondary`, `outline`, `destructive`, `ghost`, `link` | + `primary`, `success`, `warning`, `error`, `info`                       |
| Token name `--accent` | Saturated brand blue                                              | Saturated brand violet (semantics preserved)                             |

The Figma library at https://www.figma.com/design/eHCER1DdlXffFVUlU8L3lc/Alacrity?node-id=1813-1074 is now the canonical source of truth.

## Migration steps

```bash
# 1. Pull the new tokens, fonts, and docs
git fetch upstream
git merge upstream/develop

# 2. Re-install (fonts use next/font/google so no package change needed)
npm install

# 3. Verify your app still boots
npm run dev
```

## Things to check in your fork

- [ ] **Custom components using `text-accent`**: The semantics are preserved (saturated brand color), but the hue changed from blue to violet. Visual review needed.
- [ ] **Hardcoded radii**: If you used `rounded-lg`/`rounded-xl` in cards under the old system, they now resolve to 8px/12px (was 10px/14px). Most layouts will look the same; spot-check tight spaces.
- [ ] **Project-specific brand color**: If your downstream project overrides `--primary` or `--accent` to a different brand color, your overrides still win. Check `globals.css` for any `:root` you added downstream — it takes precedence.
- [ ] **Dark mode**: Token coverage is at parity. If you customized `.dark { … }` in your fork, re-validate against the new defaults.
- [ ] **Active nav state**: If you copied or re-implemented `dashboard-nav.tsx` with the old `bg-foreground text-background` active state, swap it to `bg-sidebar-accent text-sidebar-accent-foreground`.

## Rolling back (escape hatch)

If a downstream project needs to keep the old palette temporarily, override at the `:root` level in your project's own `globals.css` — do **not** modify the foundation tokens:

```css
/* project-specific override — keeps your existing UI on the old palette */
:root {
  --primary: oklch(0.09 0 0);
  --accent: oklch(0.55 0.24 262);
  /* ...other overrides... */
}
```

Better long-term: open a PR to align your project with Smithers DS so downstream design reviews stay coherent.
