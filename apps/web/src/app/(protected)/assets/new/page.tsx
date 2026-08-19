'use client';

import { useRouter } from 'next/navigation';
import AssetsPage from '../page';
import AssetEditorDrawer from '../../../../components/assets/AssetEditorDrawer';

export default function NewAssetPage() {
  const router = useRouter();

  return (
    <>
      <AssetsPage />
      <AssetEditorDrawer
        open
        onClose={() => router.back()}
        onSaved={() => {
          router.back();
          router.refresh();
        }}
      />
    </>
  );
}
