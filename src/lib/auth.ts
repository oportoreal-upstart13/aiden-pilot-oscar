import {
  createAuth,
  credentialsProvider,
  githubProvider,
  googleProvider,
  microsoftEntraIdProvider,
} from "@upstart13-com/aiden-auth";
import { prisma } from "@/lib/prisma";
import { aidenConfig } from "@/../aiden.config";

// Side-effect import: registers the Prisma audit sink on the
// aiden-security instance this module graph resolves.
//
// `aiden-auth` emits `audit.auth.signin` / `signout` / `createUser` from
// inside the NextAuth callbacks, which run in /api/auth/[...nextauth] —
// a route that reaches src/lib/auth.ts but never src/lib/security.ts.
// Verified empirically in phase 3: without this, those events land on the
// default logger sink and audit_logs stays empty for them, even though
// instrumentation.ts imports the same module (Next bundles it into a
// separate server chunk with its own copy of the package).
//
// It must import @/lib/audit directly. Importing @/lib/security.ts to
// inherit the registration would be a cycle — security.ts imports this
// file for configureSecurity's getSession.
import "@/lib/audit";

const providers = [];

if (aidenConfig.auth.providers.google) {
  providers.push(
    googleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

if (aidenConfig.auth.providers.github) {
  providers.push(
    githubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    })
  );
}

if (aidenConfig.auth.providers.microsoft) {
  providers.push(
    microsoftEntraIdProvider({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    })
  );
}

if (aidenConfig.auth.providers.credentials) {
  providers.push(credentialsProvider({ prisma }));
}

export const { handlers, signIn, signOut, auth } = createAuth({
  prisma,
  providers,
});
