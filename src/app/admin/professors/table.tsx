"use client";
import React, { useEffect, useState } from 'react';
import CreateModal from './CreateModal';

interface Professor {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  birth_date: string;
  phone: string;
  email: string;
  position: string;
  department: number; // office id
  createdAt: string;
}

const Table = () => {
  const [data, setData] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
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
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');

  useEffect(() => {
    fetchProfessors();
    fetchDepartments();
  }, []);

  const fetchProfessors = () => {
    setLoading(true);
    setError(null);
    fetch('https://buck-leading-pipefish.ngrok-free.app/api/professors', {
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
      .then((rows) => {
        setData(Array.isArray(rows) ? rows : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const fetchDepartments = () => {
    fetch('https://buck-leading-pipefish.ngrok-free.app/api/offices', {
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
      .then((rows) => {
        setDepartments(Array.isArray(rows) ? rows.map((row: any) => ({ id: row.id, name: row.department || row.name || '' })) : []);
      })
      .catch(() => setDepartments([]));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreateProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    // Validate all fields
    for (const key in form) {
      if (!form[key as keyof typeof form].toString().trim()) {
        setSubmitError('All fields are required.');
        return;
      }
    }
    setSubmitLoading(true);
    try {
      // Convert department to number (id)
      const payload = { ...form, department: Number(form.department) };
      const res = await fetch('https://buck-leading-pipefish.ngrok-free.app/api/professors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create professor');
      setShowModal(false);
      setForm({
        first_name: '',
        last_name: '',
        middle_name: '',
        birth_date: '',
        phone: '',
        email: '',
        position: '',
        department: ''
      });
      fetchProfessors();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create professor');
    } finally {
      setSubmitLoading(false);
    }
  };
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div style={{ padding: '0', background: 'none' }}>
      <div style={{
        background: '#fff',
        borderRadius: 22,
        boxShadow: '0 2px 16px #0001',
        maxWidth: 1200, // widened from 900
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
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 12 }}>Professors</span>
            <i className="bi bi-person-badge" style={{ color: '#22577A', fontSize: 20 }}></i>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <select
              className="form-select"
              style={{ minWidth: 180, borderRadius: 8, fontWeight: 500, color: '#22577A', border: '1px solid #e3f6fd', background: '#e3f6fd' }}
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            <button
              className="btn"
              style={{
                background: '#e3f6fd',
                color: '#22577A',
                fontWeight: 600,
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                boxShadow: '0 1px 4px #0001',
                fontSize: 16
              }}
              onClick={() => setShowModal(true)}
            >
              <i className="bi bi-plus-lg me-2"></i> Create Professor
            </button>
          </div>
        </div>
        <div style={{ padding: '0 32px' }}>
          {loading && <div className="text-center py-4"><span className="spinner-border text-primary" role="status"></span></div>}
          {error && <div className="alert alert-danger text-center">{error}</div>}
          {!loading && !error && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ maxHeight: 350, overflowY: 'auto', borderRadius: 12 }}>
                <table style={{ minWidth: 1100, width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'none' }}>
                  <thead>
                    <tr style={{ color: '#888', fontWeight: 600, fontSize: 15, border: 'none', textAlign: 'left' }}>
                      <th style={{ padding: '16px 8px' }}>Name</th>
                      <th style={{ padding: '16px 8px' }}>Birth Date</th>
                      <th style={{ padding: '16px 8px' }}>Phone</th>
                      <th style={{ padding: '16px 8px' }}>Email</th>
                      <th style={{ padding: '16px 8px' }}>Position</th>
                      <th style={{ padding: '16px 8px' }}>Department</th>
                      <th style={{ padding: '16px 8px' }}>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data
                      .filter(row => !departmentFilter || String(row.department) === departmentFilter)
                      .map((row) => {
                        const dept = departments.find(d => d.id === row.department);
                        return (
                          <tr key={row.id} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s', background: 'none', textAlign: 'left' }}>
                            <td style={{ padding: '14px 8px', color: '#22577A', fontWeight: 600 }}>{`${row.first_name} ${row.middle_name} ${row.last_name}`}</td>
                            <td style={{ padding: '14px 8px' }}>{formatDate(row.birth_date)}</td>
                            <td style={{ padding: '14px 8px' }}>{row.phone}</td>
                            <td style={{ padding: '14px 8px' }}>{row.email}</td>
                            <td style={{ padding: '14px 8px' }}>{row.position}</td>
                            <td style={{ padding: '14px 8px' }}>{dept ? dept.name : row.department}</td>
                            <td style={{ padding: '14px 8px', color: '#bdbdbd', fontWeight: 500 }}>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {data.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#888', padding: '24px 0' }}>No professors found.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <CreateModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchProfessors}
        departments={departments}
      />
    </div>
  );
};

export default Table;