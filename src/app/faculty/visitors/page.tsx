"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { toManilaDateTime } from '../../../lib/manila';

interface Visit {
  id: number;
  visitorsID: string;
  dept_id?: number;
  prof_id?: number;
  purpose?: string;
  createdAt?: string;
  qr_tagged?: number;
}

const VisitorsLogPage = () => {
  const [rows, setRows] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getFacultyId = (): number | null => {
    try {
      const raw = localStorage.getItem('facultyAuth') || localStorage.getItem('adminAuth');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const id = parsed?.id ?? parsed?.prof_id ?? parsed?.user_id ?? null;
      if (typeof id === 'number') return id;
      if (typeof id === 'string' && id) return Number(id);
      return null;
    } catch { return null; }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      const profId = getFacultyId();
      if (!profId) {
        setError('No faculty user id found in local storage.');
        setLoading(false);
        return;
      }
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
      try {
        // Try server-side filter first
        const res = await fetch(`${apiBase}/api/office_visits?prof_id=${encodeURIComponent(profId)}`, {
          headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        });
        let text = await res.text();
        if (!res.ok) throw new Error(text || 'Failed to fetch office visits');
        if (text.trim().startsWith('<!DOCTYPE html>')) throw new Error('Received HTML instead of JSON. Backend may be down.');
        let json: any = [];
        try { json = JSON.parse(text); } catch { json = []; }
        let list: Visit[] = Array.isArray(json) ? json : [];
        // If API returned all, filter client-side
        if (list.length && !list.every(v => String(v.prof_id) === String(profId))) {
          list = list.filter(v => String(v.prof_id) === String(profId));
        }
        setRows(list);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#e3f6fd' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 220, minHeight: '100vh' }}>
        <TopBar />
        <div style={{ padding: 32 }}>
          <div style={{
            background: '#fff', borderRadius: 22, boxShadow: '0 2px 16px #0001',
            padding: '16px 24px', maxWidth: 1100, margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px 8px' }}>
              <div style={{ fontWeight: 800, color: '#222', fontSize: 20 }}>My Visitors Log</div>
            </div>
            <div>
              {loading && <div className="text-center py-4"><span className="spinner-border text-primary" role="status"></span></div>}
              {error && <div className="alert alert-danger text-center my-3">{error}</div>}
              {!loading && !error && (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ minWidth: 720 }}>
                    <thead>
                      <tr style={{ color: '#888' }}>
                        <th>Visitor ID</th>
                        <th>Purpose</th>
                        <th>Date/Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700, color: '#22577A' }}>{r.visitorsID}</td>
                          <td>{r.purpose || '-'}</td>
                          <td style={{ color: '#bdbdbd' }}>{r.createdAt ? toManilaDateTime(r.createdAt) : '-'}</td>
                          <td>
                            {r.qr_tagged ? (
                              <span className="badge bg-success">Tagged</span>
                            ) : (
                              <span className="badge bg-secondary">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length === 0 && (
                    <div className="text-center text-muted py-3">No visitors found for your account.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitorsLogPage;
