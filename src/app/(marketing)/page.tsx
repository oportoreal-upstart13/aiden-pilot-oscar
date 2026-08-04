import Link from "next/link";
import { Button } from "@upstart13-com/aiden-ui/components/button";
import { Badge } from "@upstart13-com/aiden-ui/components/badge";
import { brand } from "@/config/brand";
import {
  ArrowRight,
  Layers,
  ShieldCheck,
  Database,
  KeyRound,
  ScrollText,
  Wrench,
  Terminal,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   TODO: Replace this entire page with your product's landing page.

   Everything below is SCAFFOLD content that ships with the AIDEN starter
   — it markets the SDK, not your product. The `capabilities` and `steps`
   arrays, the hero copy, and the code-panel example are all placeholders.
   Delete what you don't need and build your real marketing page here.
   ════════════════════════════════════════════════════════════════════ */

// SCAFFOLD DATA — replace with your product's real feature list.
const capabilities = [
  {
    icon: Layers,
    title: "createAIClient",
    pkg: "@upstart13-com/aiden-ai",
    description:
      "One client across OpenAI, Anthropic, Google, and more. Provider SDKs are optional peer deps — install only what you use.",
  },
  {
    icon: ShieldCheck,
    title: "withAuth + assertOwnership",
    pkg: "@upstart13-com/aiden-security",
    description:
      "Every API route guarded by session checks, Zod-validated bodies, and IDOR-safe ownership assertions on user-owned rows.",
  },
  {
    icon: KeyRound,
    title: "createAuth",
    pkg: "@upstart13-com/aiden-auth",
    description:
      "NextAuth v5 with credentials, OAuth, and PostgreSQL-backed sessions. Drop-in <LoginForm /> and <RegisterForm /> components.",
  },
  {
    icon: Database,
    title: "Prisma schema fragments",
    pkg: "@upstart13-com/aiden-db",
    description:
      "Compose schema from fragments under prisma/fragments/*.prisma. Auth tables ship with the package — your schema stays focused on features.",
  },
  {
    icon: ScrollText,
    title: "createLogger",
    pkg: "@upstart13-com/aiden-logging",
    description:
      "Structured logs with AsyncLocalStorage. requestId, userId, and route auto-attach inside withAuth — no manual plumbing.",
  },
  {
    icon: Wrench,
    title: "aiden CLI + codemods",
    pkg: "@upstart13-com/aiden-cli",
    description:
      "aiden doctor validates env. aiden upgrade bumps the train and runs codemods so breaking changes are mechanical, not manual.",
  },
];

// SCAFFOLD DATA — replace with your product's real onboarding steps.
const steps = [
  {
    number: "01",
    title: "Configure your providers",
    body: "Drop API keys into .env, then enable features in aiden.config.ts. aiden doctor tells you exactly what's missing.",
  },
  {
    number: "02",
    title: "Build your feature",
    body: "Add a fragment under prisma/fragments, a route under src/app/api guarded by withAuth, and a page that calls createAIClient.",
  },
  {
    number: "03",
    title: "Stay on the train",
    body: "npx aiden upgrade bumps every @upstart13-com/aiden-* package together and applies codemods. One PR, zero drift.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="border-border relative overflow-hidden border-b">
        <div className="bg-dot-grid pointer-events-none absolute inset-0" />
        <div className="from-background/0 via-background/0 to-background pointer-events-none absolute inset-0 bg-gradient-to-b" />
        <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r to-transparent" />
        <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l to-transparent" />

        <div className="relative container flex flex-col items-center py-32 text-center md:py-44">
          {/* TODO: replace badge + headline with your product's hero */}
          <Badge
            variant="outline"
            className="text-muted-foreground mb-8 font-mono text-xs tracking-widest"
          >
            STARTER SCAFFOLD
          </Badge>

          <p className="text-accent mb-4 font-mono text-sm tracking-widest">
            {brand.name}
          </p>

          <h1 className="max-w-4xl text-6xl leading-none font-bold tracking-tight md:text-8xl">
            Your app
            <br />
            <span className="text-accent">[is live.]</span>
          </h1>

          <p className="text-muted-foreground mt-8 max-w-xl text-lg leading-relaxed">
            This is the AIDEN starter landing page. Edit{" "}
            <code className="bg-muted text-foreground rounded-sm px-1.5 py-0.5 font-mono text-base">
              src/app/(marketing)/page.tsx
            </code>{" "}
            to make this page yours, or jump straight into the dashboard.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="px-8">
              <Link href="/dashboard">
                Dashboard
                <ArrowRight className="size-4" strokeWidth={1.5} />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8">
              <Link href="/register">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Capabilities ───────────────────────────────────────── */}
      <section className="border-border border-b">
        <div className="container py-24 md:py-32">
          <div className="mb-16 flex items-start justify-between gap-8">
            <div className="max-w-xl space-y-3">
              <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                [01 — What&apos;s wired up]
              </p>
              <h2 className="text-4xl leading-tight font-bold tracking-tight md:text-5xl">
                Six packages.
                <br />
                One foundation.
              </h2>
            </div>
            <p className="text-muted-foreground mt-auto hidden max-w-xs pb-1 text-sm leading-relaxed md:block">
              Each capability ships as a versioned{" "}
              <code className="bg-muted text-foreground rounded-sm px-1 py-0.5 font-mono text-xs">
                @upstart13-com/aiden-*
              </code>{" "}
              package. Use them through the thin{" "}
              <code className="bg-muted text-foreground rounded-sm px-1 py-0.5 font-mono text-xs">
                src/lib/*
              </code>{" "}
              wrappers in your app.
            </p>
          </div>

          <div className="border-border bg-border grid grid-cols-1 gap-px border sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, pkg, description }) => (
              <div
                key={title}
                className="group bg-background hover:bg-muted/30 space-y-5 p-8 transition-colors"
              >
                <div className="border-border group-hover:border-accent/40 flex size-9 items-center justify-center rounded-sm border transition-colors">
                  <Icon
                    className="text-muted-foreground group-hover:text-accent size-4 transition-colors"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="font-mono text-sm font-semibold tracking-tight">
                    {title}
                  </h3>
                  <p className="text-muted-foreground/70 font-mono text-xs tracking-wide">
                    {pkg}
                  </p>
                  <p className="text-muted-foreground pt-1 text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="border-border bg-muted/20 border-b">
        <div className="container py-24 md:py-32">
          <div className="mb-16 space-y-3">
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              [02 — Workflow]
            </p>
            <h2 className="text-4xl leading-tight font-bold tracking-tight md:text-5xl">
              Configure. Build.
              <br />
              Stay on the train.
            </h2>
          </div>

          <div className="border-border grid grid-cols-1 gap-0 border md:grid-cols-3">
            {steps.map(({ number, title, body }, i) => (
              <div
                key={number}
                className={`space-y-6 p-10 ${i < steps.length - 1 ? "border-border border-b md:border-r md:border-b-0" : ""}`}
              >
                <span className="text-accent font-mono text-5xl leading-none font-bold">
                  {number}
                </span>
                <div className="border-border space-y-2 border-t pt-2">
                  <h3 className="text-base font-semibold tracking-tight">
                    {title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Developer section ──────────────────────────────────── */}
      <section className="border-border border-b">
        <div className="container py-24 md:py-32">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="space-y-3">
                <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                  [03 — A guarded route, end to end]
                </p>
                <h2 className="text-4xl leading-tight font-bold tracking-tight md:text-5xl">
                  Auth, validation,
                  <br />
                  ownership, AI —
                  <br />
                  <span className="text-accent">[in one handler.]</span>
                </h2>
              </div>
              <p className="text-muted-foreground max-w-sm leading-relaxed">
                Every API route follows the same shape:{" "}
                <code className="bg-muted text-foreground rounded-sm px-1 py-0.5 font-mono text-xs">
                  withAuth
                </code>
                ,{" "}
                <code className="bg-muted text-foreground rounded-sm px-1 py-0.5 font-mono text-xs">
                  parseRequest
                </code>
                ,{" "}
                <code className="bg-muted text-foreground rounded-sm px-1 py-0.5 font-mono text-xs">
                  assertOwnership
                </code>
                . The SDK handles the plumbing — you write the feature.
              </p>
              <ul className="space-y-3">
                {[
                  "withAuth attaches requestId + userId to logs",
                  "parseRequest validates bodies via Zod",
                  "assertOwnership prevents IDOR on user data",
                  "createAIClient swaps providers without rewrites",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <span className="border-accent/40 mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border">
                      <span className="text-accent font-mono text-xs font-bold">
                        ✓
                      </span>
                    </span>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-border overflow-hidden rounded-xl border">
              <div className="border-border bg-muted/30 flex items-center justify-between border-b px-5 py-3">
                <div className="flex items-center gap-2">
                  <Terminal
                    className="text-muted-foreground size-3.5"
                    strokeWidth={1.5}
                  />
                  <span className="text-muted-foreground font-mono text-xs">
                    src/app/api/messages/route.ts
                  </span>
                </div>
                <span className="text-muted-foreground/50 font-mono text-xs">
                  TypeScript
                </span>
              </div>
              <div className="bg-muted/10 p-6">
                <pre className="overflow-x-auto font-mono text-sm leading-relaxed">
                  <code>
                    <span className="text-accent">import</span>
                    {" { withAuth, parseRequest } "}
                    <span className="text-accent">from</span>
                    {' "@upstart13-com/aiden-security";\n'}
                    <span className="text-accent">import</span>
                    {" { createAIClient } "}
                    <span className="text-accent">from</span>
                    {' "@/lib/ai";\n'}
                    <span className="text-accent">import</span>
                    {" { z } "}
                    <span className="text-accent">from</span>
                    {' "zod";\n\n'}
                    <span className="text-muted-foreground">{"const"}</span>
                    {" Body = z.object({ prompt: z.string().min(1) });\n\n"}
                    <span className="text-accent">export const</span>
                    {" POST = "}
                    <span className="text-muted-foreground">withAuth</span>
                    {"("}
                    <span className="text-accent">async</span>
                    {" (req, { session }) => {\n"}
                    {"  "}
                    <span className="text-accent">const</span>
                    {" body = "}
                    <span className="text-accent">await</span>
                    {" parseRequest(req, Body);\n"}
                    {"  "}
                    <span className="text-accent">const</span>
                    {" ai = createAIClient({\n"}
                    {"    provider: "}
                    <span className="text-accent">{'"anthropic"'}</span>
                    {",\n"}
                    {"    model: "}
                    <span className="text-accent">{'"claude-opus-4-7"'}</span>
                    {",\n  });\n"}
                    {"  "}
                    <span className="text-accent">return</span>
                    {" ai.chat({ messages: [\n"}
                    {"    { role: "}
                    <span className="text-accent">{'"user"'}</span>
                    {", content: body.prompt },\n"}
                    {"  ] });\n"}
                    {"});"}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className="bg-foreground text-background">
        <div className="container flex flex-col items-center py-24 text-center md:py-32">
          <p className="mb-6 font-mono text-xs tracking-widest uppercase opacity-50">
            [Next steps]
          </p>
          <h2 className="max-w-3xl text-4xl leading-tight font-bold tracking-tight md:text-6xl">
            The foundation is wired.
            <br />
            Build your feature.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed opacity-60">
            Run{" "}
            <code className="bg-background/10 rounded-sm px-1.5 py-0.5 font-mono text-base">
              npx aiden doctor
            </code>{" "}
            to validate your environment, then start with{" "}
            <code className="bg-background/10 rounded-sm px-1.5 py-0.5 font-mono text-base">
              src/app/dashboard
            </code>
            .
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-background text-foreground hover:bg-background/90 px-8"
            >
              <Link href="/dashboard">
                Dashboard
                <ArrowRight className="size-4" strokeWidth={1.5} />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="hover:bg-background/10 text-background px-8 opacity-60 hover:opacity-100"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
