'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function BusinessUnitsPage() {
  useEffect(() => { redirect('/companies'); }, []);
  return null;
}
