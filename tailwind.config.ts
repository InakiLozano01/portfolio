import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            h2: {
              color: 'var(--primary)',
              fontWeight: '700',
            },
            h3: {
              color: 'var(--primary)',
              fontWeight: '600',
            },
            'ul > li': {
              '&::marker': {
                color: 'var(--primary)',
              },
            },
            'ol > li': {
              '&::marker': {
                color: 'var(--primary)',
              },
            },
            a: {
              color: 'var(--primary)',
              '&:hover': {
                color: 'var(--primary-foreground)',
              },
            },
            code: {
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
              padding: '0.25rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
            },
            pre: {
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
            },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config
