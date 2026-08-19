'use client';

import AppErrorState from '../../components/feedback/AppErrorState';

export default function SystemError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppErrorState reset={reset} homeHref="/system" title="System console could not load" message="Something interrupted the System Admin console. You can try again or return to the platform overview." />;
}
