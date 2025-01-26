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
    // Allow image domains for TinyMCE
    images: {
        domains: ['localhost'],
    }
}

module.exports = nextConfig; 