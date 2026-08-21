# Design System — Data Display

> **Source of truth:** [Figma Smithers DS](https://www.figma.com/design/eHCER1DdlXffFVUlU8L3lc/Alacrity?node-id=1813-1074).

## Tables

Use the `Table` primitives from `@upstart13-com/aiden-ui` for all tabular data.

### Standard Data Table

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@upstart13-com/aiden-ui";

<div className="border-border rounded-sm border">
  <Table>
    <TableHeader>
      <TableRow className="bg-muted hover:bg-muted">
        <TableHead className="text-foreground font-semibold">Name</TableHead>
        <TableHead className="text-foreground font-semibold">Status</TableHead>
        <TableHead className="text-foreground text-right font-semibold">
          Actions
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map((item) => (
        <TableRow key={item.id} className="hover:bg-muted/50">
          <TableCell className="font-medium">{item.name}</TableCell>
          <TableCell>
            <Badge variant="secondary">{item.status}</Badge>
          </TableCell>
          <TableCell className="text-right">
            <DropdownMenu>{/* actions */}</DropdownMenu>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>;
```

### Table Header Style

- Always wrap table in `rounded-sm border border-border` container
- Header row: `bg-muted hover:bg-muted` — prevents hover effect on header
- `TableHead` cells: `font-semibold text-foreground` — not muted, fully readable
- Body rows: `hover:bg-muted/50` — subtle hover state

### Table with Toolbar

```tsx
<div className="space-y-4">
  {/* Toolbar */}
  <div className="flex items-center justify-between gap-4">
    <Input
      placeholder="Search…"
      className="max-w-xs"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <Filter className="mr-2 size-4" strokeWidth={1.5} />
        Filter
      </Button>
      <Button size="sm">
        <Plus className="mr-2 size-4" strokeWidth={1.5} />
        Add New
      </Button>
    </div>
  </div>

  {/* Table */}
  <div className="border-border rounded-sm border">
    <Table>…</Table>
  </div>

  {/* Pagination */}
  <div className="text-muted-foreground flex items-center justify-between text-sm">
    <p>
      Showing {start}–{end} of {total}
    </p>
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page === 1}
        onClick={prevPage}
      >
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasNext}
        onClick={nextPage}
      >
        Next
      </Button>
    </div>
  </div>
</div>
```

### Sortable Column Header

```tsx
<TableHead
  className="text-foreground cursor-pointer font-semibold select-none"
  onClick={() => toggleSort("name")}
>
  <div className="flex items-center gap-1">
    Name
    {sortField === "name" ? (
      sortDir === "asc" ? (
        <ChevronUp className="size-3.5" />
      ) : (
        <ChevronDown className="size-3.5" />
      )
    ) : (
      <ChevronsUpDown className="text-muted-foreground size-3.5" />
    )}
  </div>
</TableHead>
```

---

## Metric Cards (KPI / Stats)

Always displayed in a responsive grid. Each card has: label → value → delta.

```tsx
const metrics = [
  { label: "Total Revenue", value: "$48,295", delta: "+18%", trend: "up" },
  { label: "Active Users", value: "1,284", delta: "+12%", trend: "up" },
  { label: "Churn Rate", value: "2.4%", delta: "-0.3%", trend: "down" },
  { label: "Avg. Session", value: "4m 12s", delta: "+8s", trend: "up" },
];

<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {metrics.map((m) => (
    <Card key={m.label} className="p-5">
      <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
        {m.label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{m.value}</p>
      <p
        className={cn(
          "mt-1 text-xs",
          m.trend === "up"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-destructive"
        )}
      >
        {m.delta} vs last period
      </p>
    </Card>
  ))}
</div>;
```

**Metric card rules:**

- Label: `text-xs font-medium tracking-widest uppercase text-muted-foreground`
- Value: `text-3xl font-bold tabular-nums`
- Delta: green for positive, destructive for negative — the ONLY place non-token colors appear
- Grid: 1 col mobile → 2 col tablet → 4 col desktop (or 3 for 3 metrics)
- No shadows on metric cards — border only

---

## Empty States

Every empty state: icon + title + description + action.

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="bg-muted mb-4 rounded-sm p-3">
    <FileX className="text-muted-foreground size-6" strokeWidth={1.5} />
  </div>
  <h3 className="text-base font-semibold">No results found</h3>
  <p className="text-muted-foreground mt-1 max-w-xs text-sm">
    Try adjusting your search or filter to find what you're looking for.
  </p>
  <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
    Clear filters
  </Button>
</div>
```

**First-time / onboarding empty state:**

```tsx
<div className="flex flex-col items-center justify-center py-20 text-center">
  <div className="border-border mb-6 rounded-sm border border-dashed p-6">
    <Plus className="text-muted-foreground size-8" strokeWidth={1} />
  </div>
  <h3 className="text-lg font-semibold">Create your first project</h3>
  <p className="text-muted-foreground mt-2 max-w-sm text-sm">
    Projects help you organize your work. Get started by creating one.
  </p>
  <Button className="mt-6">
    <Plus className="mr-2 size-4" strokeWidth={1.5} />
    New Project
  </Button>
</div>
```

---

## Code Blocks

For displaying AI outputs, API responses, keys, or technical content.

```tsx
<div className="bg-muted border-border rounded-sm border">
  <div className="border-border flex items-center justify-between border-b px-4 py-2">
    <span className="text-muted-foreground text-xs font-medium">JSON</span>
    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={handleCopy}>
      <Copy className="mr-1 size-3.5" strokeWidth={1.5} />
      <span className="text-xs">Copy</span>
    </Button>
  </div>
  <pre className="text-foreground overflow-x-auto p-4 font-mono text-sm">
    <code>{JSON.stringify(data, null, 2)}</code>
  </pre>
</div>
```

---

## Key/Value Display (Detail Views)

```tsx
<dl className="space-y-4">
  {[
    { label: "API Key ID", value: "key_live_abc123" },
    { label: "Created", value: "Feb 20, 2026" },
    { label: "Last Used", value: "2 hours ago" },
  ].map(({ label, value }) => (
    <div key={label} className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground w-32 shrink-0 text-sm">{label}</dt>
      <dd className="text-foreground text-right text-sm font-medium">
        {value}
      </dd>
    </div>
  ))}
</dl>
```

---

## Data Display Rules

1. Numeric values: always `tabular-nums` class to prevent layout shift
2. Long strings (IDs, hashes): `font-mono text-sm` + `truncate` with tooltip for full value
3. Dates: use consistent format — `MMM DD, YYYY` for dates, `X hours ago` for relative
4. Currency: always right-align in tables; use `$` prefix and 2 decimal places
5. Status values: always use `Badge` component, never raw colored text
6. Empty cells: render `—` (em dash) not `null`, `undefined`, or empty string
7. Large numbers: format with commas (`1,284` not `1284`)

---

## Do's and Don'ts

### Do

- Wrap every `Table` in `rounded-sm border border-border`
- Apply `tabular-nums` to any numeric column (counts, currency, dates)
- Use `Badge` for status values
- Right-align numeric and action columns
- Render `—` (em dash) for empty cells — never `null`, `undefined`, or empty string
- Format large numbers with thousand separators (`1,284`, not `1284`)

### Don't

- Use `text-emerald-*` / `text-green-*` broadly — raw semantic colors belong only on metric-card deltas
- Add a hover style to header rows — lock with `bg-muted hover:bg-muted`
- Nest tables — flatten or link out to a detail view
- Show a blank screen on empty data — use the icon + title + description + action empty-state pattern
- Ship a metric card without a delta — the comparison is what makes it a metric
- Let ID/hash strings wrap — `font-mono text-sm` + `truncate` + Tooltip for the full value
