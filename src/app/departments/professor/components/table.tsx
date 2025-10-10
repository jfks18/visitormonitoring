'use client';
import React, { useEffect, useState } from 'react';

interface Professor {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  birth_date?: string;
  phone?: string;
  email?: string;
  position?: string;
  department?: number;
  createdAt?: string;
}

const Table = () => {
  const [data, setData] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to read dept_id from localStorage.adminAuth
  const getDeptIdFromLocalStorage = (): number | null => {
    try {
      const raw = localStorage.getItem('adminAuth');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // login saved as { adminToken, username, dept_id }
      const id = parsed?.dept_id ?? parsed?.department ?? parsed?.deptId ?? null;
      if (typeof id === 'number') return id;
      if (typeof id === 'string' && id.trim() !== '') return Number(id);
      return null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const deptId = getDeptIdFromLocalStorage();
    if (!deptId) {
      setError('Department not found for current user.');
      setLoading(false);
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
    const url = `${apiBase}/api/professors/department/${deptId}`;
    setLoading(true);
    setError(null);
    fetch(url, {
      headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    })
      .then(async res => {
        const text = await res.text();
        if (!res.ok) throw new Error('Failed to fetch: ' + text);
        if (text.trim().startsWith('<!DOCTYPE html>')) throw new Error('Received HTML instead of JSON. The backend may be down or the URL is incorrect.');
        try {
          return JSON.parse(text);
        } catch {
          throw new Error('Response is not valid JSON: ' + text);
        }
      })
      .then(rows => setData(Array.isArray(rows) ? rows : []))
      .catch(err => {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to load professors');
      })
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString();
  };

  return (
    <div style={{ padding: '0', background: 'none' }}>
      <div style={{
        background: '#fff',
        borderRadius: 22,
        boxShadow: '0 2px 16px #0001',
        maxWidth: 1200,
        margin: '32px auto',
        padding: '0 0 24px 0',
        border: 'none',
        textAlign: 'left',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '32px 32px 0 32px',
          fontWeight: 700,
          fontSize: 22,
          color: '#222',
          textAlign: 'left',
          justifyContent: 'flex-start'
        }}>
          <span style={{ marginRight: 12 }}>Department Professors</span>
          <i className="bi bi-person-badge" style={{ color: '#22577A', fontSize: 20 }}></i>
        </div>
        <div style={{ padding: '0 32px' }}>
          {loading && <div className="text-center py-4"><span className="spinner-border text-primary" role="status"></span></div>}
          {error && <div className="alert alert-danger text-center">{error}</div>}
          {!loading && !error && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ maxHeight: 500, overflowY: 'auto', borderRadius: 12 }}>
                <table style={{ minWidth: 800, width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'none' }}>
                  <thead>
                    <tr style={{ color: '#888', fontWeight: 600, fontSize: 15, border: 'none', textAlign: 'left' }}>
                      <th style={{ padding: '16px 8px' }}>Name</th>
                      <th style={{ padding: '16px 8px' }}>Position</th>
                      <th style={{ padding: '16px 8px' }}>Phone</th>
                      <th style={{ padding: '16px 8px' }}>Email</th>
                      <th style={{ padding: '16px 8px' }}>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s', background: 'none', textAlign: 'left' }}>
                        <td style={{ padding: '14px 8px', color: '#22577A', fontWeight: 600 }}>{`${row.first_name} ${row.middle_name ?? ''} ${row.last_name}`.replace(/  +/g, ' ').trim()}</td>
                        <td style={{ padding: '14px 8px' }}>{row.position ?? '-'}</td>
                        <td style={{ padding: '14px 8px' }}>{row.phone ?? '-'}</td>
                        <td style={{ padding: '14px 8px' }}>{row.email ?? '-'}</td>
                        <td style={{ padding: '14px 8px', color: '#bdbdbd', fontWeight: 500 }}>{formatDate(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#888', padding: '24px 0' }}>No professors found for this department.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Table;