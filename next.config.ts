import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the ~100MB Docker image (see deploy/).
  output: "standalone",
};

export default nextConfig;
