'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingSkeleton } from '../../../../components/loading-state';

export default function User360LegacyRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  useEffect(() => {
    if (userId) {
      router.replace(`/users/${encodeURIComponent(userId)}`);
    } else {
      router.replace('/users');
    }
  }, [router, userId]);

  return <LoadingSkeleton rows={4} label="Opening employee 360…" />;
}
