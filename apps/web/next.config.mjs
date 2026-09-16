/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // AVIF first: these are photographs, where it saves materially over WebP at equal quality.
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
