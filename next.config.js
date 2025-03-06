/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    domains: [
      'localhost', 
      'vwbzxklttacbrcnxbxpw.supabase.co',
      'idbjagstpgidlkjklhlv.supabase.co'
    ],
  },
  // Temporarily disable ESLint during build for development testing
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 