'use client';

import { useEffect, useState } from 'react';
import AssetEditorDrawer from './AssetEditorDrawer';

const BUTTON_LABEL = 'New asset';

export default function AssetCreateBridge() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (window.location.pathname !== '/assets') return;
      const target = event.target as Element | null;
      const button = target?.closest('button');
      if (!button || button.textContent?.trim() !== BUTTON_LABEL) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setOpen(true);
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return <AssetEditorDrawer open={open} onClose={() => setOpen(false)} onSaved={() => setOpen(false)} />;
}
