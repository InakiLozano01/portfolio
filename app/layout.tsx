import { GeistSans } from 'geist/font/sans'
import './globals.css'
import { metadata as baseMetadata } from './metadata'
import { Metadata } from 'next'

export const metadata: Metadata = baseMetadata

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
				<meta name="theme-color" content="#1a2433" />
			</head>
			<body className={GeistSans.className} suppressHydrationWarning>
				{children}
			</body>
		</html>
	)
}
