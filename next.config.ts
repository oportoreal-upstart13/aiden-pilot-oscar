import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake server-only modules out of client bundles.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
