"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';

interface ProfessorUser {
  user_id: number;
  username: string;
  email?: string;
  phone?: string;
  dept_id?: number | null;
  role?: number | string;
  prof_id?: number | null;
  professor_id?: number | null;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  prof_email?: string;
  department?: string | number | null;
  status?: string | number | null;
}

const ProfilePage = () => {
  const [data, setData] = useState<ProfessorUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Resolve professor id (professors.id) from localStorage
  const getProfessorId = (): number | null => {
    try {
      const rawF = localStorage.getItem('facultyAuth');
      const rawA = localStorage.getItem('adminAuth');
      const f = rawF ? JSON.parse(rawF) : null;
      const a = rawA ? JSON.parse(rawA) : null;
      const pick = (o: any) => {
        if (!o) return null;
        const v = o.prof_id ?? null; // new endpoint expects professor id
        if (typeof v === 'number') return v;
        if (typeof v === 'string' && v) return Number(v);
        return null;
      };
      const id = pick(f) ?? pick(a) ?? null;
      return id;
    } catch { return null; }
  };

  useEffect(() => {
    const load = async () => {
      const profId = getProfessorId();
      if (!profId) { setError('No professor id (prof_id) found in local storage.'); setLoading(false); return; }
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
      setError(null); setLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/professor-users/${encodeURIComponent(profId)}`, {
          headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }
        });
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
    const profIdParam = getProfessorId();
    if (!profIdParam) { setError('No professor id (prof_id) found'); return; }
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
    setSaving(true); setError(null);
    try {
      // Build payloads for new endpoint
      const userPayload: any = {};
      if (data.email !== undefined) userPayload.email = data.email;
      if (data.phone !== undefined) userPayload.phone = data.phone;
      if (data.status !== undefined) userPayload.status = data.status;

      const professorPayload: any = {};
      if (data.prof_email !== undefined) professorPayload.email = data.prof_email;

      const body: any = { };
      if (Object.keys(userPayload).length > 0) body.user = userPayload;
      if (Object.keys(professorPayload).length > 0) body.professor = professorPayload;

      const res = await fetch(`${apiBase}/api/professor-users/by-professor/${encodeURIComponent(String(profIdParam))}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify(body)
      });
      const t = await res.text();
      if (!res.ok) throw new Error(t || 'Failed to save profile');
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
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ background: '#fff', borderRadius: 22, boxShadow: '0 2px 16px #0001', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 800, color: '#222', fontSize: 20 }}>My Profile</div>
              </div>
              <div className="mt-3">
                {loading && <div className="text-center py-4"><span className="spinner-border text-primary" role="status"></span></div>}
                {error && <div className="alert alert-danger text-center">{error}</div>}
                {(!loading && !error && data) && (
                  <form onSubmit={save}>
                    <div className="row g-4">
                      <div className="col-md-6">
                        <div className="fw-bold mb-2" style={{ color: '#22577A' }}>Account</div>
                        <div className="mb-3">
                          <label className="form-label">Username</label>
                          <input className="form-control" value={data.username || ''} disabled />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Email</label>
                          <input type="email" className="form-control" value={data.email || ''} onChange={e => setData({ ...data, email: e.target.value })} />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Phone</label>
                          <input className="form-control" value={data.phone || ''} onChange={e => setData({ ...data, phone: e.target.value })} />
                        </div>
                        <div className="row g-3">
                          <div className="col-12">
                            <label className="form-label">Role</label>
                            <input className="form-control" value={(data.role === 1 || data.role === '1') ? 'Admin' : (data.role === 2 || data.role === '2') ? 'Professor' : (data.role === 3 || data.role === '3') ? 'Department' : String(data.role ?? '')} disabled />
                          </div>
                        </div>
                        <div className="row g-3 mt-1">
                          <div className="col-md-6">
                            <label className="form-label">Status</label>
                            <select className="form-select" value={String(data.status ?? '')} onChange={e => setData({ ...data, status: e.target.value })}>
                              <option value="">Select status</option>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="away">Away</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="fw-bold mb-2" style={{ color: '#22577A' }}>Professor</div>
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
                          <div className="col-md-6">
                            <label className="form-label">Professor Email</label>
                            <input type="email" className="form-control" value={data.prof_email || ''} onChange={e => setData({ ...data, prof_email: e.target.value })} />
                          </div>
                          {/** Department field removed per request */}
                        </div>
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
    </div>
  );
};

export default ProfilePage;
