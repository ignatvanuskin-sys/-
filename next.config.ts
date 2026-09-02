import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ["pg", "@electric-sql/pglite", "pg-mem", "better-sqlite3"],
};

export default nextConfig;
