'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type AssetType = { id: string; name: string };
type Asset = { id: string; assetNumber: string; status: string; assetType: { name: string } };

const STATES = ['REQUESTED', 'IN_STOCK', 'ASSIGNED', 'IN_REPAIR', 'LOST_STOLEN', 'RETIRED', 'DISPOSED'];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePrefix, setNewTypePrefix] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [assetData, typeData] = await Promise.all([apiFetch('/assets'), apiFetch('/assets/types')]);
      setAssets(assetData);
      setAssetTypes(typeData);
      if (typeData.length > 0 && !selectedTypeId) setSelectedTypeId(typeData[0].id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateType(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch('/assets/types', {
        method: 'POST',
        body: JSON.stringify({ name: newTypeName, prefix: newTypePrefix.toUpperCase() }),
      });
      setNewTypeName('');
      setNewTypePrefix('');
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCreateAsset() {
    setError(null);
    try {
      await apiFetch('/assets', { method: 'POST', body: JSON.stringify({ assetTypeId: selectedTypeId }) });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleTransition(assetId: string, toState: string) {
    setError(null);
    try {
      await apiFetch(`/assets/${assetId}/transition`, { method: 'POST', body: JSON.stringify({ toState }) });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Assets</h1>

      <section style={{ marginBottom: 24, padding: 12, background: '#f7f7f7', borderRadius: 6 }}>
        <h3 style={{ marginTop: 0 }}>Asset Types</h3>
        <form onSubmit={handleCreateType} style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Type name (e.g. Laptop)"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            style={{ flex: 2, padding: 8 }}
          />
          <input
            placeholder="Prefix (e.g. LAP)"
            value={newTypePrefix}
            onChange={(e) => setNewTypePrefix(e.target.value)}
            style={{ flex: 1, padding: 8 }}
          />
          <button type="submit" style={{ padding: '8px 16px' }}>
            Add Type
          </button>
        </form>
      </section>

      {assetTypes.length > 0 && (
        <div style={{ marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} style={{ padding: 8 }}>
            {assetTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button onClick={handleCreateAsset} style={{ padding: '8px 16px' }}>
            Create Asset
          </button>
        </div>
      )}

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : assets.length === 0 ? (
        <p>No assets yet. Create an asset type above, then create an asset.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th style={{ padding: 8 }}>Asset #</th>
              <th style={{ padding: 8 }}>Type</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Transition</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{a.assetNumber}</td>
                <td style={{ padding: 8 }}>{a.assetType.name}</td>
                <td style={{ padding: 8 }}>{a.status}</td>
                <td style={{ padding: 8 }}>
                  <select
                    defaultValue=""
                    onChange={(e) => e.target.value && handleTransition(a.id, e.target.value)}
                    style={{ padding: 4 }}
                  >
                    <option value="" disabled>
                      Move to…
                    </option>
                    {STATES.filter((s) => s !== a.status).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
