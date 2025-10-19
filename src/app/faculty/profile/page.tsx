"use client";
import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';

interface ProfileData {
  id: number;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  position?: string;
}

const ProfilePage = () => {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      const id = getFacultyId();
      if (!id) { setError('No faculty user id found.'); setLoading(false); return; }
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
      setError(null); setLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/professors/${id}`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } });
        const text = await res.text();
        if (!res.ok) throw new Error(text || 'Failed to load profile');
        let json: any = {}; try { json = JSON.parse(text); } catch {}
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const id = getFacultyId();
    if (!id) { setError('No faculty user id found.'); return; }
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${apiBase}/api/professors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ phone: data.phone, email: data.email, position: data.position })
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'Failed to save profile');
      alert('Profile updated');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#e3f6fd' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 220, minHeight: '100vh' }}>
        <TopBar />
        <div style={{ padding: 32 }}>
          <div className="card shadow-sm" style={{ maxWidth: 720, margin: '0 auto', borderRadius: 18 }}>
            <div className="card-header bg-white" style={{ borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
              <div className="fw-bold" style={{ color: '#222' }}>My Profile</div>
            </div>
            <div className="card-body">
              {loading && <div className="text-center py-4"><span className="spinner-border text-primary" role="status"></span></div>}
              {error && <div className="alert alert-danger text-center">{error}</div>}
              {(!loading && !error && data) && (
                <form onSubmit={save}>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">First Name</label>
                      <input className="form-control" value={data.first_name || ''} disabled />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Middle Name</label>
                      <input className="form-control" value={data.middle_name || ''} disabled />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Last Name</label>
                      <input className="form-control" value={data.last_name || ''} disabled />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Position</label>
                      <input className="form-control" value={data.position || ''} onChange={e => setData({ ...data, position: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Phone</label>
                      <input className="form-control" value={data.phone || ''} onChange={e => setData({ ...data, phone: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-control" value={data.email || ''} onChange={e => setData({ ...data, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="d-flex justify-content-end mt-4">
                    <button type="submit" className="btn btn-success" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
