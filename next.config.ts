import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev HMR and hydration are blocked when the browser uses 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
