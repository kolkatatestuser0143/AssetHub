'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type Company = { id: string; name: string; code: string };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch('/companies');
      setCompanies(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch('/companies', { method: 'POST', body: JSON.stringify({ name, code }) });
      setName('');
      setCode('');
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Companies</h1>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          placeholder="Company name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: 2, padding: 8 }}
        />
        <input
          placeholder="Code (e.g. XYZ)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" style={{ padding: '8px 16px' }}>
          Add
        </button>
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : companies.length === 0 ? (
        <p>No companies yet — add one above.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Code</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{c.name}</td>
                <td style={{ padding: 8 }}>{c.code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
