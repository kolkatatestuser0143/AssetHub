import type { Metadata } from 'next';
import './globals.css';
import '../styles/motion.css';
import '../styles/modal-compat.css';
import '../styles/ui-refresh.css';
import '../styles/ui-polish.css';
import '../styles/back-to-top.css';
import ThemeDialogBridge from '../components/theme-dialog-bridge';
import AssetCreateBridge from '../components/assets/asset-create-bridge';
import BackToTop from '../components/back-to-top';
import { ToastProvider } from '../components/toast';

export const metadata: Metadata = { title: 'AssetHub | IT Asset Management', description: 'Enterprise IT Asset Management platform', icons: { icon: '/assethub-icon.svg', shortcut: '/assethub-icon.svg', apple: '/assethub-icon.svg' } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><ToastProvider>{children}<BackToTop /></ToastProvider><ThemeDialogBridge /><AssetCreateBridge /></body></html>;
}
