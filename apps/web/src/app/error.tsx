'use client';

import AppErrorState from '../components/feedback/AppErrorState';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppErrorState reset={reset} />;
}
