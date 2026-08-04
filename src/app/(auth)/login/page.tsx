import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@upstart13-com/aiden-auth/components";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Enter your credentials to sign in
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="hover:text-primary underline underline-offset-4"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
