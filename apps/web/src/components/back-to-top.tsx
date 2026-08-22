'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > Math.max(720, window.innerHeight * 1.1));
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  if (!visible) return null;

  return <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="back-to-top ui-interactive motion-pop" aria-label="Back to top" title="Back to top"><ArrowUp size={17}/><span className="hidden sm:inline">Top</span></button>;
}
