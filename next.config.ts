import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable the Next.js logo dev indicator badge on bottom-left
  devIndicators: false,

  // Allow cross-origin images from avatar providers and Cloudinary/S3
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
