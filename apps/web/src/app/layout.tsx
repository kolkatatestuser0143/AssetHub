import type { Metadata } from 'next';
import './globals.css';
import './theme-hardening.css';

export const metadata: Metadata = { title: 'AssetHub | IT Asset Management', description: 'Enterprise IT Asset Management platform' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
