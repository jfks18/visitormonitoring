"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const GuardLoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
      const res = await fetch(`${apiBase}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!res.ok) throw new Error(data.message || data.raw || 'Login failed');
      console.log('[GuardLogin] backend response:', data);
      const role = data.user?.role;
      if (role !== 4 && role !== '4') {
        throw new Error('Access denied: not a guard account');
      }
      localStorage.setItem('guardAuth', JSON.stringify(data.user));
      router.replace('/registration'); // or '/scanner' if that's the guard home
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#e3f6fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 16px #0001', padding: 32, minWidth: 340 }}>
        <div style={{ fontWeight: 700, fontSize: 22, color: '#22577A', marginBottom: 18 }}>Guard Login</div>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input type="text" className="form-control" value={username} onChange={e => setUsername(e.target.value)} autoFocus required />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className="alert alert-danger py-1 my-2">{error}</div>}
          <button type="submit" className="btn btn-success w-100" disabled={loading} style={{ fontWeight: 600 }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GuardLoginPage;
