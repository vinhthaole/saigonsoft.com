/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ['genkit', '@genkit-ai/core', '@genkit-ai/firebase', '@genkit-ai/google-cloud'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // Allow larger bodies for AI image generation
    },
    // serverActionsTimeout: 120000, // 2 minutes - Removed as it's unrecognized
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'saigonsoft.com' }],
        destination: 'https://www.saigonsoft.com/:path*',
        permanent: true, // 301 redirect - tốt cho SEO
      },
    ];
  },
};

export default nextConfig;
