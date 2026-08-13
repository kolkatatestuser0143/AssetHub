import type { Metadata } from 'next';
import { AuthProvider } from '../lib/auth-context';
import './globals.css';

export const metadata: Metadata = { title: 'AssetHub | IT Asset Management', description: 'Enterprise IT Asset Management platform' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>}
