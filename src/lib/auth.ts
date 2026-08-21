import {
  createAuth,
  credentialsProvider,
  githubProvider,
  googleProvider,
  microsoftEntraIdProvider,
} from "@upstart13-com/aiden-auth";
import { prisma } from "@/lib/prisma";
import { aidenConfig } from "@/../aiden.config";

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
