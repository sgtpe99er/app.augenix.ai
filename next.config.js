/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NEXT_PREVIEW_MODE ? { distDir: '.next-preview' } : {}),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
