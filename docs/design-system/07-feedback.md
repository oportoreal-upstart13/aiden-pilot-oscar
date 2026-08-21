# Design System — Feedback States

> **Source of truth:** [Figma Smithers DS](https://www.figma.com/design/eHCER1DdlXffFVUlU8L3lc/Alacrity?node-id=1813-1074). Status colors map to the semantic tokens (`success`, `warning`, `destructive`, `info`).

## Loading — Skeleton (preferred)

Always use skeletons that match the shape of the real content. Never use full-page spinners unless the entire page is gating on async data.

```tsx
import { Skeleton } from "@upstart13-com/aiden-ui";

// Metric cards skeleton
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {Array.from({ length: 4 }).map((_, i) => (
    <Card key={i} className="p-5">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-9 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </Card>
  ))}
</div>

// Table skeleton
<div className="rounded-sm border border-border">
  <Table>
    <TableHeader>
      <TableRow className="bg-muted hover:bg-muted">
        <TableHead><Skeleton className="h-4 w-24" /></TableHead>
        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-sm" /></TableCell>
          <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

## Loading — Inline Spinner

For button loading states and small inline loaders only.

```tsx
import { Loader2 } from "lucide-react";

// Button loading state
<Button disabled={isLoading}>
  {isLoading
    ? <><Loader2 className="size-4 mr-2 animate-spin" />Processing…</>
    : "Submit"
  }
</Button>

// Inline loader (table cell, status)
<span className="flex items-center gap-1.5 text-sm text-muted-foreground">
  <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} />
  Loading…
</span>
```

## Toast Notifications

Use `sonner` (already installed). Mount the themed `<Toaster />` from `@upstart13-com/aiden-ui` once in your root layout, and call `toast` from the `sonner` package directly.

```tsx
import { toast } from "sonner";

// Success
toast.success("Project created", {
  description: "Your project is ready to use.",
});

// Error
toast.error("Failed to save", {
  description: error.message ?? "Please try again.",
});

// Info
toast.info("Sync in progress", {
  description: "This may take a few seconds.",
});

// With action
toast.success("API key created", {
  description: "Copy it now — it won't be shown again.",
  action: {
    label: "Copy",
    onClick: () => copyToClipboard(key),
  },
});
```

**Toast rules:**

- Always include a `description` for context
- Success: green — used after non-obvious operations (create, delete, sync)
- Error: red — all failed API calls surface here
- Duration: default (4s) for success; `duration: Infinity` for errors with required action
- Never use toast for form validation errors — those go inline via `FormMessage`

## Error States

### Page-Level Error

```tsx
<div className="flex flex-col items-center justify-center py-24 text-center">
  <div className="bg-destructive/10 mb-4 rounded-sm p-3">
    <AlertTriangle className="text-destructive size-6" strokeWidth={1.5} />
  </div>
  <h3 className="text-base font-semibold">Failed to load data</h3>
  <p className="text-muted-foreground mt-1 max-w-xs text-sm">
    {error.message}. Check your connection and try again.
  </p>
  <Button variant="outline" size="sm" className="mt-4" onClick={retry}>
    <RefreshCw className="mr-2 size-4" strokeWidth={1.5} />
    Retry
  </Button>
</div>
```

### Inline Error (non-form)

> **`Alert` is not shipped by `@upstart13-com/aiden-ui`.** Install the shadcn primitive once, then theme it with our tokens: `npx shadcn@latest add alert` (writes `src/components/ui/alert.tsx`). The `Alert`/`AlertTitle`/`AlertDescription` examples below assume that local path.

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

<Alert variant="destructive">
  <AlertCircle className="size-4" />
  <AlertTitle>Sync failed</AlertTitle>
  <AlertDescription>
    Could not connect to the data source. Check your credentials in Settings.
  </AlertDescription>
</Alert>;
```

### Informational / Warning Alert

```tsx
// Info
<Alert>
  <Info className="size-4" />
  <AlertTitle>Free tier limit</AlertTitle>
  <AlertDescription>
    You've used 80% of your monthly quota.{" "}
    <Link href="/billing" className="underline">
      Upgrade your plan
    </Link>
    .
  </AlertDescription>
</Alert>
```

## Empty States

See `05-data-display.md` for empty state patterns.

## Progress Indicators

> **`Progress` is not shipped by `@upstart13-com/aiden-ui`.** Install the shadcn primitive once, then theme it with our tokens: `npx shadcn@latest add progress` (writes `src/components/ui/progress.tsx`).

```tsx
import { Progress } from "@/components/ui/progress";

// Determinate progress (file upload, quota usage)
<div className="space-y-1.5">
  <div className="text-muted-foreground flex justify-between text-xs">
    <span>Storage used</span>
    <span>800 MB / 1 GB</span>
  </div>
  <Progress value={80} className="h-1.5" />
</div>;
```

## Feedback Rules

1. **Never silent success** — always show a toast after create, update, delete, sync
2. **Never silent failure** — always show a toast or inline error for failed API calls
3. **Loading states are always present** — never leave the user staring at stale content
4. **Error messages are specific** — include what failed and how to fix it
5. **No generic "Error" toasts** — minimum: operation name + reason + action (e.g., "Failed to delete project. You may not have permission.")
6. **Skeleton shape must match real content** — a table skeleton has the same number of rows/columns as the expected data
7. **Retry is always available** for page-level errors
8. **Toast stacking** — `sonner` handles this automatically; don't fire multiple toasts in loops

---

## Do's and Don'ts

### Do

- Match skeleton shape to real content: same row count, same column widths
- Toast after every non-trivial mutation (create / update / delete / sync)
- Include a specific `description` on every toast
- Use `duration: Infinity` on errors that require a user action
- Offer a Retry action on page-level errors
- Use `Alert variant="destructive"` for non-blocking inline errors (not toasts)

### Don't

- Use a full-page spinner when a layout-matching skeleton is possible
- Use `toast.error` for form validation — those errors are inline via `FormMessage`
- Fire toasts inside a loop — `sonner` stacks them, but the UX is chaos
- Ship a "Something went wrong" message — always name the operation and the reason
- Leave a screen empty while data loads — skeleton-first, always
- Use `Loader2` as a page-level loader — reserve it for inline/button contexts
