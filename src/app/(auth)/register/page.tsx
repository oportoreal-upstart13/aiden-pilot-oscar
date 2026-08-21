import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RegisterForm } from "@upstart13-com/aiden-auth/components";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="text-muted-foreground text-sm">
          Get started — no credit card required
        </p>
      </div>
      <Suspense>
        <RegisterForm />
      </Suspense>
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link
          href="/login"
          className="hover:text-primary underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
