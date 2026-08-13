'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { systemLogin } from '../../../lib/api-client';

export default function SystemLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await systemLogin(email, password);
      sessionStorage.setItem('itam_system_refresh_token', result.refreshToken);
      router.push('/system');
    } catch (err: any) {
      setError(err.message ?? 'System login failed');
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>System Administrator</h1>
      <p>Sign in to the AssetHub platform administration console.</p>
      <form onSubmit={handleSubmit}>
        <input aria-label="Email" type="email" placeholder="System administrator email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }} />
        <input aria-label="Password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }} />
        {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit" style={{ width: '100%', padding: 10 }}>Sign in to System Console</button>
      </form>
    </main>
  );
}
