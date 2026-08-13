'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type Permission = { id: string; key: string };
type Role = { id: string; name: string; isSystem: boolean; permissions: { permission: Permission }[] };

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [name, setName] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        apiFetch('/roles'),
        apiFetch('/roles/permissions'),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function togglePermission(key: string) {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch('/roles', {
        method: 'POST',
        body: JSON.stringify({ name, permissionKeys: selectedKeys }),
      });
      setName('');
      setSelectedKeys([]);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Roles</h1>

      <form onSubmit={handleCreate} style={{ marginBottom: 32 }}>
        <input
          placeholder="Role name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 8, width: '100%', marginBottom: 12 }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
          {permissions.map((p) => (
            <label key={p.id} style={{ fontSize: 14 }}>
              <input
                type="checkbox"
                checked={selectedKeys.includes(p.key)}
                onChange={() => togglePermission(p.key)}
              />{' '}
              {p.key}
            </label>
          ))}
        </div>
        <button type="submit" style={{ padding: '8px 16px' }}>
          Create Role
        </button>
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {roles.map((r) => (
            <li key={r.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
              <strong>{r.name}</strong> {r.isSystem && <em>(system)</em>}
              <div style={{ fontSize: 12, color: '#666' }}>
                {r.permissions.map((rp) => rp.permission.key).join(', ') || 'No permissions'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
