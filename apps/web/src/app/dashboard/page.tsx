import Link from 'next/link';

export default function DashboardPage() {
  return (
    <main style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Dashboard</h1>
      <nav style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <Link href="/companies">Companies</Link>
        <Link href="/roles">Roles</Link>
        <Link href="/assets">Assets</Link>
      </nav>
    </main>
  );
}
