import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  rewrites: [
    {
      source: '/api/:path*',
      destination: 'http://79.143.93.107:8080/api/:path*',
    },
  ],
};
