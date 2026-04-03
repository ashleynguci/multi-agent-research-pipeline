import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Research Pipeline',
  description: 'Multi-agent AI research pipeline',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
