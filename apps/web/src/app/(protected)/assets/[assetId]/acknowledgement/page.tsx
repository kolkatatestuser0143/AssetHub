'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import AssetAcknowledgementPanel from '../../../../../components/users/AssetAcknowledgementPanel';

export default function AssetAcknowledgementPage() {
  const params = useParams<{ assetId: string }>();
  return <div className='mx-auto max-w-[1200px] space-y-6'><Link href={`/assets/${params.assetId}`} className='inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900'><ArrowLeft size={16}/>Back to asset</Link><AssetAcknowledgementPanel assetId={params.assetId} /></div>;
}
