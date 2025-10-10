import React, { useState, useEffect } from 'react';

interface Professor {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: number;
}

interface Props {
  show: boolean;
  onClose: () => void;
  professor?: Professor | null;
  onSuccess?: () => void;
}

const AccountModal: React.FC<Props> = ({ show, onClose, professor, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departmentName, setDepartmentName] = useState<string | null>(null);

  useEffect(() => {
    if (professor) {
      // Suggest a username by combining first and last name
      const suggested = `${professor.first_name}.${professor.last_name}`.toLowerCase().replace(/\s+/g, '');
      setUsername(suggested);
      setPassword('');
      setError('');
      // load department name when professor has department id
      if (professor.department) {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
        fetch(`${apiBase}/api/offices`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } })
          .then(async res => {
            const text = await res.text();
            if (!res.ok) throw new Error('Failed to fetch offices: ' + text);
            try { return JSON.parse(text); } catch { return [] }
          })
          .then((rows: any[]) => {
            const found = Array.isArray(rows) ? rows.find(r => Number(r.id) === Number(professor.department)) : null;
            setDepartmentName(found ? (found.department || found.name || '-') : '-');
          })
          .catch(() => setDepartmentName('-'));
      } else {
        setDepartmentName(null);
      }
    }
  }, [professor]);

  if (!show || !professor) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Username and password are required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        username: username.trim(),
        password,
        role: 'professor',
        professorId: professor.id,
        email: professor.email,
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to create user');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0006', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, minWidth: 360, boxShadow: '0 2px 24px #0003' }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Professor Account</div>
        <div style={{ marginBottom: 12 }}>
          <div><strong>Name:</strong> {professor.first_name} {professor.middle_name ?? ''} {professor.last_name}</div>
          <div><strong>Email:</strong> {professor.email ?? '-'}</div>
          <div><strong>Phone:</strong> {professor.phone ?? '-'}</div>
          <div><strong>Position:</strong> {professor.position ?? '-'}</div>
          <div><strong>Department:</strong> {departmentName ?? '-'}</div>
        </div>
        <form onSubmit={handleCreateUser}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontWeight: 600 }}>Username</label>
            <input className="form-control" value={username} onChange={e => setUsername(e.target.value)} />

            <label style={{ fontWeight: 600 }}>Password</label>
            <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} />

            <label style={{ fontWeight: 600 }}>Role</label>
            <input className="form-control" value="professor" readOnly />

            {error && <div className="alert alert-danger py-1">{error}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-success" type="submit" disabled={loading} style={{ minWidth: 100 }}>{loading ? 'Creating...' : 'Create User'}</button>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountModal;
