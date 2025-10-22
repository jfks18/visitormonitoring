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
  const [visitorNames, setVisitorNames] = useState<Record<string, string>>({});
  // Track Manila calendar day (YYYY-MM-DD) so "Today" follows Manila and auto-refreshes at Manila midnight
  const getManilaYMD = () => {
    try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); }
    catch { return new Date().toISOString().slice(0,10); }
  };
  const [manilaDay, setManilaDay] = useState<string>(getManilaYMD());
  useEffect(() => {
    const id = setInterval(() => {
      const ymd = getManilaYMD();
      setManilaDay(prev => (prev !== ymd ? ymd : prev));
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const getFacultyId = (): number | null => {
    try {
      const rawFaculty = localStorage.getItem('facultyAuth');
      const rawAdmin = localStorage.getItem('adminAuth');
      const parsedFaculty = rawFaculty ? JSON.parse(rawFaculty) : null;
      const parsedAdmin = rawAdmin ? JSON.parse(rawAdmin) : null;

      const pickId = (obj: any) => {
        if (!obj) return null;
        // Prefer user_id for consistency with profile; adjust if backend expects prof_id
        const val = obj.user_id ?? obj.prof_id ?? null;
        if (typeof val === 'number') return val;
        if (typeof val === 'string' && val) return Number(val);
        return null;
      };

      const idFromFaculty = pickId(parsedFaculty);
      const idFromAdmin = pickId(parsedAdmin);
      const finalId = idFromFaculty ?? idFromAdmin ?? null;
      try { console.log('[Faculty Visitors] id check:', { faculty_user_id: parsedFaculty?.user_id, admin_user_id: parsedAdmin?.user_id, faculty_prof_id: parsedFaculty?.prof_id, admin_prof_id: parsedAdmin?.prof_id, finalId }); } catch {}
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
        // Backend accepts professor/user identifier via query param `id`
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

  // Helpers for Manila-local date comparisons using YYYY-MM-DD strings
  const toManilaYMD = (iso?: string | null): string | null => {
    if (!iso) return null;
    try { return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); }
    catch { return null; }
  };
  const todayYMD = manilaDay; // already Manila YYYY-MM-DD
  const monthStartYMD = useMemo(() => {
    try {
      const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    } catch { return todayYMD; }
  }, [todayYMD]);
  const monthEndYMD = useMemo(() => {
    try {
      const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    } catch { return todayYMD; }
  }, [todayYMD]);

  const filteredRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    try {
      const sorted = [...rows].sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
      if (filter === 'today') {
        return sorted.filter(r => toManilaYMD(r.createdAt) === todayYMD);
      }
      // month filter using YYYY-MM-DD string comparison (safe for en-CA format)
      return sorted.filter(r => {
        const ymd = toManilaYMD(r.createdAt);
        return !!ymd && ymd >= monthStartYMD && ymd <= monthEndYMD;
      });
    } catch {
      return rows;
    }
  }, [rows, filter, todayYMD, monthStartYMD, monthEndYMD]);

  // Format a person's full name from various possible fields
  function formatFullName(person: any | null | undefined) {
    if (!person) return null;
    const fullCandidates = ['full_name', 'fullname', 'name', 'fullName'];
    for (const key of fullCandidates) {
      if (person[key] && String(person[key]).trim() !== '') return String(person[key]).trim();
    }
    const first = person.first_name ?? person.firstName ?? person.firstname ?? person.fname ?? person.given_name;
    const middle = person.middle_name ?? person.middleName ?? person.middlename ?? person.mname;
    const last = person.last_name ?? person.lastName ?? person.lastname ?? person.lname ?? person.family_name;
    const parts = [first, middle, last].filter((p: any) => p && String(p).trim() !== '');
    return parts.length ? parts.join(' ') : null;
  }

  // Fetch visitor names for unique visitorsID values (only those missing in cache)
  useEffect(() => {
    const run = async () => {
      if (!rows || rows.length === 0) return;
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
      const ids = Array.from(new Set(rows.map(r => String(r.visitorsID || '')).filter(Boolean)));
      const missing = ids.filter(id => !visitorNames[id]);
      if (missing.length === 0) return;
      const entries = await Promise.all(missing.map(async (vid) => {
        try {
          const res = await fetch(`${apiBase}/api/visitorsdata/${encodeURIComponent(vid)}`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } });
          if (!res.ok) return [vid, ''] as const;
          const json = await res.json().catch(() => null);
          const name = formatFullName(json) || '';
          return [vid, name] as const;
        } catch {
          return [vid, ''] as const;
        }
      }));
      const map: Record<string, string> = {};
      entries.forEach(([vid, name]) => { if (name) map[vid] = name; });
      if (Object.keys(map).length > 0) setVisitorNames(prev => ({ ...prev, ...map }));
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

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
                        <th>Visitor</th>
                        <th>Prof ID</th>
                        <th>Purpose</th>
                        <th>Date/Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700, color: '#22577A' }}>{visitorNames[String(r.visitorsID)] || r.visitorsID}</td>
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
