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
  const [filter, setFilter] = useState<'today' | 'month'>('today');

  const getFacultyId = (): number | null => {
    try {
      const rawFaculty = localStorage.getItem('facultyAuth');
      const rawAdmin = localStorage.getItem('adminAuth');
      const parsedFaculty = rawFaculty ? JSON.parse(rawFaculty) : null;
      const parsedAdmin = rawAdmin ? JSON.parse(rawAdmin) : null;

      const pickId = (obj: any) => {
        if (!obj) return null;
        const val = obj.prof_id ?? null; // Use prof_id only
        if (typeof val === 'number') return val;
        if (typeof val === 'string' && val) return Number(val);
        return null;
      };

      const idFromFaculty = pickId(parsedFaculty);
      const idFromAdmin = pickId(parsedAdmin);
      const finalId = idFromFaculty ?? idFromAdmin ?? null;
      try { console.log('[Faculty Visitors] prof_id check:', { faculty_prof_id: parsedFaculty?.prof_id, admin_prof_id: parsedAdmin?.prof_id, finalId }); } catch {}
      return finalId;
    } catch { return null; }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
  const profId = getFacultyId();
      console.log('[Faculty Visitors] resolved profId:', profId);
      if (!profId) {
        setError('No faculty user id found in local storage.');
        setLoading(false);
        return;
      }
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
      try {
        // New API: path param /api/office_visits/:prof_id
        const res = await fetch(`${apiBase}/api/office_visits?id=${encodeURIComponent(profId)}`, {
          headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        });
        const text = await res.text();
        if (res.status === 404) {
          // Treat 404 as no records for this professor
          setRows([]);
          setError(null);
          return;
        }
        if (!res.ok) throw new Error(text || 'Failed to fetch office visits');
        if (text.trim().startsWith('<!DOCTYPE html>')) throw new Error('Received HTML instead of JSON. Backend may be down.');
        let json: any = [];
        try { json = JSON.parse(text); } catch { json = []; }
        const list: Visit[] = Array.isArray(json)
          ? json
          : (json && typeof json === 'object' && 'id' in json ? [json as Visit] : []);
        setRows(list);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  // Helpers to compute Manila-local date ranges
  function getManilaDayRange(date: Date) {
    const manila = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    manila.setHours(0, 0, 0, 0);
    // convert back to ISO range that matches stored createdAt
    const start = new Date(manila.getTime() - (manila.getTimezoneOffset() * 60000));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const todayManila = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const monthStartManila = new Date(todayManila.getFullYear(), todayManila.getMonth(), 1);
  const monthEndManila = new Date(todayManila.getFullYear(), todayManila.getMonth() + 1, 0);

  const filteredRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    try {
      if (filter === 'today') {
        const { start, end } = getManilaDayRange(todayManila);
        return rows
          .filter(r => !!r.createdAt && (r.createdAt as string) >= start && (r.createdAt as string) <= end)
          .sort((a, b) => (a.createdAt! < b.createdAt! ? 1 : -1));
      }
      // month filter
      const start = getManilaDayRange(monthStartManila).start;
      const end = getManilaDayRange(monthEndManila).end;
      return rows
        .filter(r => !!r.createdAt && (r.createdAt as string) >= start && (r.createdAt as string) <= end)
        .sort((a, b) => (a.createdAt! < b.createdAt! ? 1 : -1));
    } catch {
      return rows;
    }
  }, [rows, filter]);

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
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn"
                  style={{ background: filter === 'today' ? '#22577A' : '#e3f6fd', color: filter === 'today' ? '#fff' : '#22577A', fontWeight: 600, border: 'none', borderRadius: 8, padding: '6px 14px' }}
                  onClick={() => setFilter('today')}
                >
                  Today
                </button>
                <button
                  className="btn"
                  style={{ background: filter === 'month' ? '#22577A' : '#e3f6fd', color: filter === 'month' ? '#fff' : '#22577A', fontWeight: 600, border: 'none', borderRadius: 8, padding: '6px 14px' }}
                  onClick={() => setFilter('month')}
                >
                  Monthly
                </button>
              </div>
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
                        <th>Prof ID</th>
                        <th>Purpose</th>
                        <th>Date/Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700, color: '#22577A' }}>{r.visitorsID}</td>
                          <td>{typeof r.prof_id === 'number' ? r.prof_id : '-'}</td>
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
                  {filteredRows.length === 0 && (
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
