import type { Metadata } from 'next';
import './globals.css';
import '../styles/motion.css';
import '../styles/modal-compat.css';
import ThemeDialogBridge from '../components/theme-dialog-bridge';

export const metadata: Metadata = { title: 'AssetHub | IT Asset Management', description: 'Enterprise IT Asset Management platform', icons: { icon: '/assethub-icon.svg', shortcut: '/assethub-icon.svg', apple: '/assethub-icon.svg' } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}<ThemeDialogBridge /></body></html>;
}
