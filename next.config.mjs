import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

if (process.env.NODE_ENV === 'development') {
    await setupDevPlatform({ configPath: 'wrangler.local.jsonc' });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/file/:name*',
                destination: '/api/file/:name*', 
            },
        ]
    },
};

export default nextConfig;
