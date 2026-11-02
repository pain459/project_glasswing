/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://glasswing-sky-api:8000/api/:path*',
      },
      {
        source: '/health/:path*',
        destination: 'http://glasswing-sky-api:8000/health/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
