import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "bullmq", "pg"],
  reactCompiler: true,
};

export default nextConfig;
