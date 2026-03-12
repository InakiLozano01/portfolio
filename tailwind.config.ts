import type { Config } from 'tailwindcss'

const config: Config = {
	content: [
		'./pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./components/**/*.{js,ts,jsx,tsx,mdx}',
		'./app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))',
				},
				navy: {
					DEFAULT: '#1a2433',
					light: '#263547',
				},
				bordeaux: {
					DEFAULT: '#800020',
					light: '#9a1a3a',
				},
				cream: {
					DEFAULT: '#faf8f5',
					dark: '#f0ece6',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			fontFamily: {
				sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
			},
			letterSpacing: {
				display: '-0.035em',
			},
			typography: {
				DEFAULT: {
					css: {
						h2: {
							color: 'hsl(var(--primary))',
							fontWeight: '700',
						},
						h3: {
							color: 'hsl(var(--primary))',
							fontWeight: '600',
						},
						'ul > li': {
							'&::marker': {
								color: 'hsl(var(--primary))',
							},
						},
						'ol > li': {
							'&::marker': {
								color: 'hsl(var(--primary))',
							},
						},
						a: {
							color: 'hsl(var(--primary))',
							'&:hover': {
								color: 'hsl(var(--primary-foreground))',
							},
						},
						code: {
							backgroundColor: 'hsl(var(--muted))',
							color: 'hsl(var(--muted-foreground))',
							padding: '0.25rem',
							borderRadius: '0.25rem',
							fontSize: '0.875em',
						},
						pre: {
							backgroundColor: 'hsl(var(--muted))',
							color: 'hsl(var(--muted-foreground))',
						},
					},
				},
			},
		},
	},
	plugins: [
		require('tailwindcss-animate'),
		require('@tailwindcss/typography'),
	],
}
export default config
