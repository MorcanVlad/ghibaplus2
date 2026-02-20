/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Forțăm ignorarea erorilor de TypeScript la build
    ignoreBuildErrors: true,
  }
};

export default nextConfig;