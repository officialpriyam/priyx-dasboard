import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
	title: 'Priyx Dashboard',
	description: 'Manage Priyx bot modules and server settings.',
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
