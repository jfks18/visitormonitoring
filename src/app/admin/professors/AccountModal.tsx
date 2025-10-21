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
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departmentName, setDepartmentName] = useState<string | null>(null);

  const generatePassword = (len: number = 8) => {
    try {
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const array = new Uint32Array(len);
      crypto.getRandomValues(array);
      return Array.from(array, x => charset[x % charset.length]).join('');
    } catch {
      // Fallback if crypto.getRandomValues not available
      return Math.random().toString(36).slice(-len).padEnd(len, 'x');
    }
  };

  useEffect(() => {
    if (professor) {
      // Suggest a username by combining first and last name
      const suggested = `${professor.first_name}.${professor.last_name}`.toLowerCase().replace(/\s+/g, '');
  setUsername(suggested);
  setPassword(generatePassword(8));
  setError('');
  setEmail(professor.email ?? '');
  setPhone(professor.phone ?? '');
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
    if (!username.trim() || !password || !email.trim() || !phone.trim()) {
      setError('Username, email, phone and password are required');
      return;
    }
    setLoading(true);
    try {
      // First try a dedicated email-check endpoint if available
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
        const checkRes = await fetch(`${apiBase}/api/users/check-email?email=${encodeURIComponent(email.trim())}`, { headers: { 'Accept': 'application/json' } });
        if (checkRes.ok) {
          const checkJson = await checkRes.json().catch(() => ({}));
          if (checkJson?.exists) {
            throw new Error('An account with this email already exists');
          }
        }
        // If checkRes returns 404 or other non-ok, we'll just continue to POST and rely on server duplicate handling
      } catch (checkErr) {
        // If the check endpoint doesn't exist or failed, ignore and proceed to creation; duplicates will be caught by POST
        // But if check explicitly says exists, the thrown error will be caught by outer catch
        if (checkErr instanceof Error && checkErr.message === 'An account with this email already exists') throw checkErr;
        // otherwise, log and continue
        console.info('Email-check endpoint not available or failed, proceeding to create. Details:', checkErr);
      }

      // Build payload to match server expectation
      const rawAuth = localStorage.getItem('adminAuth');
      let deptId: number | null = null;
      let adminToken: string | null = null;
      try {
        if (rawAuth) {
          const parsed = JSON.parse(rawAuth);
          deptId = parsed?.dept_id ?? null;
          adminToken = parsed?.adminToken ?? null;
        }
      } catch {
        deptId = null;
        adminToken = null;
      }

      // Prefer the selected professor's department when available
      if (professor?.department) {
        deptId = Number(professor.department) || null;
      } else if (!deptId && professor?.department) {
        // redundant guard, kept for safety
        deptId = Number(professor.department) || null;
      }

      const payload = {
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        dept_id: deptId,
        // keep a reference to professor if server wants it
        professorId: professor.id,
      };

      const headers: any = { 'Content-Type': 'application/json' };
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      // Try to parse response body for helpful debug info
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!res.ok) {
        // Build a detailed message for debugging
        const msg = data?.message || data?.raw || `Server returned ${res.status}`;
        const debug = `Status: ${res.status} - ${msg} - dept_id:${deptId}`;
        throw new Error(debug);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Create user error:', err);
      // Friendly handling for duplicate email
      if (err instanceof Error && /email already exists|already exists|ER_DUP_ENTRY/i.test(err.message)) {
        setError('An account with this email or username already exists.');
      } else {
        setError(err.message || 'Failed to create user - check console for details');
      }
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
            <div className="input-group">
              <input className="form-control" type="text" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" className="btn btn-outline-secondary" onClick={() => setPassword(generatePassword(8))}>Regenerate</button>
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>An 8-character temporary password is generated automatically. You can regenerate or edit it.</div>

            <label style={{ fontWeight: 600 }}>Email</label>
            <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} />

            <label style={{ fontWeight: 600 }}>Phone</label>
            <input className="form-control" value={phone} onChange={e => setPhone(e.target.value)} />

            <label hidden style={{ fontWeight: 600 }}>Role</label>
            <input hidden className="form-control" value="professor" readOnly />

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
