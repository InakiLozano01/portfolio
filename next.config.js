const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    webpack: (config, { isServer }) => {
        if (!isServer) {
            // Copy TinyMCE files to public directory
            config.plugins.push(
                new CopyPlugin({
                    patterns: [
                        {
                            from: path.join(__dirname, 'node_modules', 'tinymce'),
                            to: path.join(__dirname, 'public', 'tinymce'),
                            globOptions: {
                                ignore: ['**/readme.md']
                            }
                        }
                    ],
                })
            );
        }
        return config;
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'inakilozano.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '3003',
                pathname: '/**',
            }
        ],
        // Always keep images unoptimized for better compatibility with direct file access
        unoptimized: true,
        // Increase cache time for images to avoid frequent reprocessing
        minimumCacheTTL: 3600,
        // Allow SVG and other formats
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
    }
}

module.exports = nextConfig; 