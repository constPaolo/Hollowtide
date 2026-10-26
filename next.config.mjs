/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // AVIF first, then WebP: the stills are large JPEGs.
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    // Paths from the previous version of the site.
    return [
      { source: '/catalog', destination: '/work', permanent: true },
      { source: '/brief/:slug', destination: '/work/:slug', permanent: true },
      { source: '/connect', destination: '/contact', permanent: true },
    ];
  },
};

export default nextConfig;
