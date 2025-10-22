"use client";
import React, { useState } from "react";

interface Department {
  id: number;
  name: string;
}

interface CreateModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: Department[];
}

const initialForm = {
  first_name: '',
  last_name: '',
  middle_name: '',
  birth_date: '',
  phone: '',
  email: '',
  position: '',
  department: ''
};

const CreateModal: React.FC<CreateModalProps> = ({ show, onClose, onSuccess, departments }) => {
  const [form, setForm] = useState({ ...initialForm });
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    for (const key in form) {
      if (!form[key as keyof typeof form].toString().trim()) {
        setSubmitError('All fields are required.');
        return;
      }
    }
    setSubmitLoading(true);
    try {
      const payload = { ...form, department: Number(form.department) };
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
      // 1) Save professor first
      const res = await fetch(`${apiBase}/api/professors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      let data: any = {}; try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!res.ok) throw new Error(data.message || data.raw || 'Failed to create professor');

  // 2) Create linked user account with 8-char random password and username=first.last
  // Extract professor id from professor create response so we can link the user record
  const profId = data.id ?? data.insertId ?? data.prof_id ?? data.professor_id ?? data.created?.id ?? null;
      const username = `${form.first_name}.${form.last_name}`.toLowerCase().replace(/\s+/g, '');
      const genPassword = (() => {
        try {
          const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          const arr = new Uint32Array(8);
          // @ts-ignore
          crypto.getRandomValues(arr);
          return Array.from(arr, x => charset[x % charset.length]).join('');
        } catch {
          return Math.random().toString(36).slice(-8).padEnd(8, 'x');
        }
      })();

      const userPayload = {
        username,
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: genPassword,
        dept_id: Number(form.department) || null,
        prof_id: profId ?? null,
        // role defaults to 2 (professor) on server if omitted
      } as any;

      try {
        const ures = await fetch(`${apiBase}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userPayload),
        });
        const utext = await ures.text();
        let ujson: any = {}; try { ujson = JSON.parse(utext); } catch { ujson = { raw: utext }; }
        if (!ures.ok) {
          // Don’t rollback professor; surface message
          throw new Error(ujson.message || ujson.raw || 'Failed to create user account');
        }
        alert(`Employee created with account.\n\nUsername: ${username}\nTemp Password: ${genPassword}\nEmail: ${form.email}`);
      } catch (accErr: any) {
        console.error('User account creation failed:', accErr);
        alert(`Professor saved, but account creation failed.\n\nReason: ${accErr.message || accErr}`);
      }

      setForm({ ...initialForm });
      onClose();
      onSuccess();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create professor');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '520px', width: '100%' }}>
        <div className="modal-content" style={{ borderRadius: 18, boxShadow: '0 4px 32px #0002' }}>
          <div className="modal-header" style={{ borderBottom: '1px solid #e3f6fd', padding: '1.25rem 2rem 1.25rem 2rem' }}>
            <h5 className="modal-title" style={{ fontWeight: 700, color: '#22577A' }}>Create Professor</h5>
            <button type="button" className="btn-close" onClick={() => { setForm({ ...initialForm }); setSubmitError(''); onClose(); }}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ padding: '2rem' }}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 500 }}>First Name</label>
                  <input type="text" className="form-control" name="first_name" value={form.first_name} onChange={handleInputChange} placeholder="Enter first name" autoFocus />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 500 }}>Last Name</label>
                  <input type="text" className="form-control" name="last_name" value={form.last_name} onChange={handleInputChange} placeholder="Enter last name" />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 500 }}>Middle Name</label>
                  <input type="text" className="form-control" name="middle_name" value={form.middle_name} onChange={handleInputChange} placeholder="Enter middle name" />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 500 }}>Birth Date</label>
                  <input type="date" className="form-control" name="birth_date" value={form.birth_date} onChange={handleInputChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 500 }}>Phone</label>
                  <input type="text" className="form-control" name="phone" value={form.phone} onChange={handleInputChange} placeholder="Enter phone number" />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 500 }}>Email</label>
                  <input type="email" className="form-control" name="email" value={form.email} onChange={handleInputChange} placeholder="Enter email" />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 500 }}>Position</label>
                  <input type="text" className="form-control" name="position" value={form.position} onChange={handleInputChange} placeholder="Enter position" />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 500 }}>Department</label>
                  <select
                    className="form-control"
                    name="department"
                    value={form.department}
                    onChange={handleInputChange}
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {submitError && <div className="alert alert-danger py-1 my-2">{submitError}</div>}
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #e3f6fd', padding: '1rem 2rem' }}>
              <button type="submit" className="btn btn-success" disabled={submitLoading} style={{ minWidth: 110 }}>
                {submitLoading ? 'Saving...' : 'Submit'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setForm({ ...initialForm }); setSubmitError(''); onClose(); }}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateModal;
