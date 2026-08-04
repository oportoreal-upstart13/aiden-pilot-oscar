# Design System — Forms

> **Source of truth:** [Figma Smithers DS — Inputs / Forms](https://www.figma.com/design/eHCER1DdlXffFVUlU8L3lc/Alacrity?node-id=1813-1074). Input sizes (SM / MD / LG) and states (default / error / disabled) follow the Figma library.

Every form in the app follows this framework. Use `react-hook-form` + `zod` for all forms.

## Standard Form Anatomy

```
[Section label — optional]
[Field label]
[Input / Select / Textarea]
[Helper text or error message]
[Spacing]
[Next field]
...
[Form actions — right-aligned]
```

## Complete Form Example

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  Input,
  Button,
} from "@upstart13-com/aiden-ui";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export function ExampleForm() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Jane Smith" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="jane@example.com" {...field} />
              </FormControl>
              <FormDescription>We'll never share your email.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost">
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

## Input Components

### Text Input

```tsx
<Input placeholder="Enter value" />
<Input type="email" placeholder="email@example.com" />
<Input type="password" />
<Input disabled value="Read-only value" />
```

### Textarea

```tsx
import { Textarea } from "@upstart13-com/aiden-ui";
<Textarea placeholder="Describe your use case…" rows={4} />;
```

**Expandable textarea** — for optional long-text fields (descriptions, notes) where the user may write a sentence or a paragraph. Let the user resize vertically; don't force a fixed height.

```tsx
<Textarea
  placeholder="What is this project for?"
  className="min-h-[72px] resize-y"
  {...field}
/>
```

- `min-h-[72px]` (~3 lines) is the standard starting height
- `resize-y` only — never `resize` or `resize-x`
- Use this for any optional description/notes field in a dialog or settings form

### Select

> **Not shipped by `@upstart13-com/aiden-ui`.** Install once, then theme with our tokens: `npx shadcn@latest add select` (writes `src/components/ui/select.tsx`).

```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select a plan" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="starter">Starter</SelectItem>
    <SelectItem value="pro">Pro</SelectItem>
    <SelectItem value="enterprise">Enterprise</SelectItem>
  </SelectContent>
</Select>;
```

### Checkbox

> **Not shipped by `@upstart13-com/aiden-ui`.** Install once, then theme with our tokens: `npx shadcn@latest add checkbox` (writes `src/components/ui/checkbox.tsx`).

```tsx
import { Checkbox } from "@/components/ui/checkbox";

<div className="flex items-center gap-2">
  <Checkbox id="terms" />
  <label htmlFor="terms" className="text-foreground cursor-pointer text-sm">
    I agree to the terms and conditions
  </label>
</div>;
```

### Radio Group

> **Not shipped by `@upstart13-com/aiden-ui`.** Install once, then theme with our tokens: `npx shadcn@latest add radio-group` (writes `src/components/ui/radio-group.tsx`).

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

<RadioGroup defaultValue="monthly">
  <div className="flex items-center gap-2">
    <RadioGroupItem value="monthly" id="monthly" />
    <label htmlFor="monthly" className="cursor-pointer text-sm">
      Monthly
    </label>
  </div>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="annual" id="annual" />
    <label htmlFor="annual" className="cursor-pointer text-sm">
      Annual
    </label>
  </div>
</RadioGroup>;
```

### Toggle-Button Multi-Select

For selecting from a small, fixed set of options (e.g. AI providers, tags, categories) where a checkbox list would feel heavy. Uses plain `<button type="button">` elements with `cn()` for selected state — no `Checkbox` component needed.

```tsx
const [selected, setSelected] = useState<string[]>([]);

function toggle(value: string) {
  setSelected((prev) =>
    prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
  );
}

<div className="space-y-2">
  <FormLabel>AI Providers</FormLabel>
  <div className="flex flex-wrap gap-2">
    {OPTIONS.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => toggle(opt.value)}
        className={cn(
          "rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors",
          selected.includes(opt.value)
            ? "border-foreground bg-foreground text-background"
            : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
</div>;
```

- Selected state: `border-foreground bg-foreground text-background` (inverted pill)
- Unselected state: `border-border text-muted-foreground` with hover softening
- Manage `selected` in `useState`; merge into form data at submit (not via `register`)
- Pre-seed from existing data: `useState<string[]>(record.providers)`
- Use when options are ≤ 8; use `Select` + multi-select for larger sets

---

## Form Layout Patterns

### Single-Column (default for dialogs/narrow contexts)

```tsx
<div className="space-y-6">{/* fields */}</div>
```

### Two-Column Grid (settings pages, wider forms)

```tsx
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">{/* fields */}</div>
```

### Section Groups (long settings forms)

```tsx
<div className="space-y-10">
  <div className="space-y-6">
    <div>
      <h3 className="text-base font-semibold">Personal Information</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        Update your name and email.
      </p>
    </div>
    <Separator />
    {/* fields */}
  </div>
  <div className="space-y-6">
    <div>
      <h3 className="text-base font-semibold">Notifications</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        Manage how you receive updates.
      </p>
    </div>
    <Separator />
    {/* fields */}
  </div>
</div>
```

## Form Action Placement

| Context             | Placement                             |
| ------------------- | ------------------------------------- |
| Dialog/modal        | Bottom-right of dialog footer         |
| Full-page form      | Bottom of form content, right-aligned |
| Inline/settings row | Right-aligned inline with row         |

## Validation & Error States

- Errors render as `<FormMessage />` — red text (`text-destructive text-xs`) below the field
- Input border turns destructive-colored on error (handled by shadcn automatically)
- Required fields: add asterisk via `<FormLabel>Name <span className="text-destructive">*</span></FormLabel>` only on public-facing forms
- Inline field-level errors, not toast notifications, for validation failures

## Submission States

```tsx
// During submission — disable and show progress
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 size-4 animate-spin" />
      Saving…
    </>
  ) : (
    "Save Changes"
  )}
</Button>
```

## Form Rules

- Always use `react-hook-form` + `zod` — never uncontrolled inputs or manual `useState` per field
- Always use `<Form>` + `<FormField>` + `<FormItem>` from shadcn — never raw label/input pairs
- `FormDescription` for optional helper text (shows below input in muted gray)
- `FormMessage` for validation errors — always included even if empty (controls layout shift)
- Never use `alert()` or `window.confirm()` for form confirmations — use Dialog
- After successful form submit: toast notification + close dialog / navigate — never silent success

---

## Do's and Don'ts

### Do

- Build every form with `react-hook-form` + `zod` + shadcn `Form` primitives
- Keep `<FormMessage />` rendered even when empty — it prevents layout shift when errors appear
- Use `FormDescription` for helper text, `FormMessage` for validation errors (not interchangeable)
- Right-align form actions; primary button is rightmost
- Reset the form in `onOpenChange` when the parent dialog closes
- Toast on successful submit, then close/navigate — never silent success

### Don't

- Manage field state with ad-hoc `useState` or uncontrolled `ref` inputs
- Use raw `<label>` + `<input>` pairs — route through `FormField` / `FormItem`
- Surface validation errors via `toast` — they belong inline via `FormMessage`
- Use `alert()` or `window.confirm()` for confirmations — open a `Dialog` instead
- Force textarea height with `resize: none` — allow `resize-y` on description/notes fields
- Add required-asterisks on internal forms — only on public-facing signup/auth surfaces
