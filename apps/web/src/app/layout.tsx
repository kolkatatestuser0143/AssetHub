import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'AssetHub | IT Asset Management', description: 'Enterprise IT Asset Management platform', icons: { icon: '/assethub-icon.svg', shortcut: '/assethub-icon.svg', apple: '/assethub-icon.svg' } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
