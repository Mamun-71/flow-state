import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Inlined into both server and client code, so "today" is the same everywhere.
  env: {
    APP_TIMEZONE: process.env.APP_TIMEZONE ?? "Asia/Dhaka",
  },
};

export default nextConfig;
