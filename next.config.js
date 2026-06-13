/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["better-sqlite3", "@hashgraph/sdk"],
  allowedDevOrigins: ["172.16.0.174"],
};

export default nextConfig;
