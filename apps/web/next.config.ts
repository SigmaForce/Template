import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL is required");
}

try {
  new URL(apiUrl);
} catch {
  throw new Error("NEXT_PUBLIC_API_URL must be a valid URL");
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
