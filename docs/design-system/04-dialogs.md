# Design System — Dialogs

> **Source of truth:** [Figma Smithers DS](https://www.figma.com/design/eHCER1DdlXffFVUlU8L3lc/Alacrity?node-id=1813-1074). Dialog corner radius is `rounded-lg` (8px) per shadcn default — matches Figma.

## Core Principle

Every dialog follows the same structure: header (title + description), body (content), footer (actions). Never deviate from this anatomy.

## Standard Dialog

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@upstart13-com/aiden-ui";

<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Supporting description that explains the context or consequence.
      </DialogDescription>
    </DialogHeader>

    {/* Body content */}
    <div className="py-4">{/* form fields, content, etc. */}</div>

    <DialogFooter>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

## Dialog Sizes

| Width class       | Usage                                         |
| ----------------- | --------------------------------------------- |
| `sm:max-w-sm`     | Simple confirmation, small alerts             |
| `sm:max-w-md`     | **Default** — forms with 2–4 fields           |
| `sm:max-w-lg`     | Forms with 5+ fields                          |
| `sm:max-w-2xl`    | Data-heavy dialogs (tables, multi-step)       |
| `sm:max-w-[90vw]` | Full-preview dialogs (never for simple forms) |

## Confirmation Dialog (Destructive)

For irreversible actions (delete, revoke, disable). The destructive button is always on the right.

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle>Delete Project</DialogTitle>
      <DialogDescription>
        This will permanently delete <strong>"{projectName}"</strong> and all
        its data. This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Deleting…
          </>
        ) : (
          "Delete Project"
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Form Dialog

For create/edit workflows. The form lives inside the dialog. Submit button is in the footer.

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Create API Key</DialogTitle>
      <DialogDescription>
        Give your API key a name to identify it later.
      </DialogDescription>
    </DialogHeader>

    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} id="create-key-form">
        <div className="space-y-6 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Key Name</FormLabel>
                <FormControl>
                  <Input placeholder="Production API" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>

    <DialogFooter>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button
        form="create-key-form"
        type="submit"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Creating…" : "Create Key"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Note: Use `id` on the form and `form=` attribute on the submit button when the button is outside `<form>` (in footer).

## Form Dialog — Inline Footer Variant

When the submit button lives _inside_ the `<form>` (not in `<DialogFooter>`), use this pattern. Avoids the `id`/`form=` attribute dance.

```tsx
<DialogContent className="sm:max-w-md">
  <DialogHeader>
    <DialogTitle>New project</DialogTitle>
  </DialogHeader>
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
      {/* fields */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating…
            </>
          ) : (
            "Create project"
          )}
        </Button>
      </div>
    </form>
  </Form>
</DialogContent>
```

- Use when the dialog has no `<DialogFooter>` slot (e.g. the form is the entire body)
- Actions div: `flex justify-end gap-2 pt-2` — `pt-2` adds breathing room above the buttons
- Prefer this over `id`+`form=` for simple single-form dialogs

---

## Plan-Limit Gate (Disabled CTA)

When a feature is blocked by the user's current plan, replace the trigger button with a disabled button + inline upgrade prompt. Never show a dialog that immediately errors.

```tsx
if (atLimit) {
  return (
    <div className="flex items-center gap-3">
      <Button size="sm" disabled className="rounded-sm opacity-60">
        <Plus className="mr-1.5 size-4" strokeWidth={1.5} />
        New project
      </Button>
      <span className="text-muted-foreground text-xs">
        {planName} plan limit reached.{" "}
        <a
          href="/billing"
          className="text-foreground font-medium hover:underline"
        >
          Upgrade
        </a>
      </span>
    </div>
  );
}
// else render <Dialog>...</Dialog> normally
```

- The disabled button retains its shape so the layout doesn't shift
- The upgrade link uses `text-foreground font-medium` — NOT `text-accent` (accent is reserved for primary CTAs)
- The API is the authoritative gate; this UI is sugar only

---

## Sheet (Side Drawer)

Use `Sheet` for detail panels, filters, or multi-step flows that need more vertical space.

```tsx
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@upstart13-com/aiden-ui";

<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Open Details</Button>
  </SheetTrigger>
  <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
    <SheetHeader>
      <SheetTitle>Record Details</SheetTitle>
      <SheetDescription>View and edit the selected record.</SheetDescription>
    </SheetHeader>
    <div className="space-y-6 py-6">{/* content */}</div>
    <SheetFooter>
      <Button>Save</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>;
```

## Dialog Rules

1. **DialogTitle is required** — every dialog must have a visible title for accessibility
2. **DialogDescription is required** — explain context/consequence, especially for destructive actions
3. **Cancel is always ghost** — `variant="ghost"`, positioned left of the primary action
4. **Primary action is right-aligned** — always the rightmost button in `DialogFooter`
5. **Destructive dialogs name the item** — `Delete "Project Alpha"` not `Delete Item`
6. **No nested dialogs** — if you need a second confirmation, use inline UI or a separate step
7. **Control open state** — always use `open` + `onOpenChange` for programmatic control
8. **Reset form on close** — call `form.reset()` in the `onOpenChange` handler
9. **No dialog-in-dialog** — use a Sheet or multi-step flow instead
10. **Max one dialog open at a time** — never stack dialogs

## Controlled Dialog Pattern

```tsx
const [open, setOpen] = useState(false);

function handleOpenChange(newOpen: boolean) {
  if (!newOpen) {
    form.reset();      // reset form on close
    setError(null);    // clear any submit errors
  }
  setOpen(newOpen);
}

<Dialog open={open} onOpenChange={handleOpenChange}>
```

---

## Do's and Don'ts

### Do

- Render both `DialogTitle` and `DialogDescription` on every dialog — accessibility requirement
- Name the item in destructive titles: `Delete "Project Alpha"`, not `Delete Item`
- Keep Cancel on the left (`variant="ghost"`) and the primary action on the right of `DialogFooter`
- Control open state with `open` + `onOpenChange`
- Reset the form in the `onOpenChange` close branch
- Use `Sheet` (side drawer) for detail panels or multi-step flows — don't just use a wider dialog

### Don't

- Nest dialogs — open a `Sheet` or advance to a next step instead
- Stack dialogs — only one open at a time
- Render a dialog that immediately errors on mount — gate the trigger (see "Plan-Limit Gate")
- Put a submit button inside `<DialogFooter>` without the `form="…"` attribute pointing at the form `id`
- Use `text-accent` on inline upgrade prompts — accent is for primary CTAs; use `text-foreground font-medium`
- Override the dialog content radius — the shadcn default (`rounded-lg` = 8px) matches the Smithers DS spec
