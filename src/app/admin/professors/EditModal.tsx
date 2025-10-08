import React, { useState, useEffect } from 'react';

interface EditModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  professor?: {
    id: number;
    first_name: string;
    last_name: string;
    middle_name: string;
    birth_date: string;
    phone: string;
    email: string;
    position: string;
    department: number;
  };
  departments: { id: number; name: string }[];
}

const EditModal: React.FC<EditModalProps> = ({ show, onClose, onSuccess, professor, departments }) => {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    birth_date: '',
    phone: '',
    email: '',
    position: '',
    department: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (professor) {
      // Format birth_date to YYYY-MM-DD for input type="date"
      let birth_date = '';
      if (professor.birth_date) {
        const d = new Date(professor.birth_date);
        if (!isNaN(d.getTime())) {
          birth_date = d.toISOString().slice(0, 10);
        } else {
          birth_date = professor.birth_date;
        }
      }
      setForm({
        first_name: professor.first_name || '',
        last_name: professor.last_name || '',
        middle_name: professor.middle_name || '',
        birth_date,
        phone: professor.phone || '',
        email: professor.email || '',
        position: professor.position || '',
        department: professor.department ? String(professor.department) : ''
      });
    }
  }, [professor, show]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!professor) return;
    // Validate all fields
    for (const key in form) {
      if (!form[key as keyof typeof form].toString().trim()) {
        setError('All fields are required.');
        return;
      }
    }
    setLoading(true);
    try {
      const payload = { ...form, department: Number(form.department) };
  const res = await fetch(`https://apivisitor.onrender.com/api/professors/${professor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update professor');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update professor');
    } finally {
      setLoading(false);
    }
  };

  if (!show || !professor) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <form onSubmit={handleUpdate} style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 350, boxShadow: '0 2px 16px #0002', textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Edit Professor</div>
        {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <input className="form-control" name="first_name" value={form.first_name} onChange={handleInputChange} placeholder="First Name" />
          <input className="form-control" name="middle_name" value={form.middle_name} onChange={handleInputChange} placeholder="Middle Name" />
          <input className="form-control" name="last_name" value={form.last_name} onChange={handleInputChange} placeholder="Last Name" />
          <input className="form-control" name="birth_date" value={form.birth_date} onChange={handleInputChange} type="date" placeholder="Birth Date" />
          <input className="form-control" name="phone" value={form.phone} onChange={handleInputChange} placeholder="Phone" />
          <input className="form-control" name="email" value={form.email} onChange={handleInputChange} placeholder="Email" />
          <input className="form-control" name="position" value={form.position} onChange={handleInputChange} placeholder="Position" />
          <select className="form-select" name="department" value={form.department} onChange={handleInputChange}>
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ minWidth: 120 }}>
            {loading ? 'Updating...' : 'Update'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={loading} style={{ minWidth: 120 }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditModal;
