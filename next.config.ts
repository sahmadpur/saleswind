import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reports became the Dashboard; keep old links and bookmarks working.
  async redirects() {
    return [
      { source: "/reports", destination: "/dashboard", permanent: true },
      { source: "/reports/:path*", destination: "/dashboard/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
