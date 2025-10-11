"use client";
import React, { useEffect, useState } from 'react';
import CreateModal from './CreateModal';
import DeleteModal from './DeleteModal';
import EditModal from './EditModal';
import AccountModal from './AccountModal';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountProfessor, setAccountProfessor] = useState<Professor | null>(null);
  const [showAccountExistsModal, setShowAccountExistsModal] = useState(false);
  const [accountExistsProfessor, setAccountExistsProfessor] = useState<Professor | null>(null);

  useEffect(() => {
    fetchProfessors();
    fetchDepartments();
  }, []);

  const fetchProfessors = () => {
    setLoading(true);
    setError(null);
  fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/professors`, {
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
  fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/offices`, {
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
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/professors`, {
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

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/professors/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete');
      }
      setShowDeleteModal(false);
      setDeleteId(null);
      fetchProfessors();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const selectedProfessor = data.find(p => p.id === deleteId);
  const editProfessor = data.find(p => p.id === editId);

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
                      <th style={{ padding: '16px 8px' }}>Actions</th>
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
                            <td style={{ padding: '14px 8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  style={{ minWidth: 70 }}
                                  onClick={async () => {
                                    setSubmitError('');
                                    try {
                                      // fetch users for the professor's department
                                      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
                                      const deptId = row.department;
                                      const res = await fetch(`${apiBase}/api/users?dept_id=${encodeURIComponent(deptId)}`, {
                                        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                                      });
                                      if (!res.ok) {
                                        // if server error, still allow opening modal and rely on server-side duplicate handling
                                        console.info('Failed to check existing users, allowing account creation: ', await res.text().catch(() => ''));
                                        setAccountProfessor(row);
                                        setShowAccountModal(true);
                                        return;
                                      }
                                      const users = await res.json().catch(() => []);
                                      const exists = Array.isArray(users) && users.some((u: any) => String(u.email).toLowerCase() === String(row.email).toLowerCase());
                                      if (exists) {
                                        // Show a modal informing the admin that an account already exists
                                        setAccountExistsProfessor(row);
                                        setShowAccountExistsModal(true);
                                        return;
                                      }
                                      setAccountProfessor(row);
                                      setShowAccountModal(true);
                                    } catch (err: any) {
                                      console.error('Error checking existing users:', err);
                                      // allow modal to open if check fails
                                      setAccountProfessor(row);
                                      setShowAccountModal(true);
                                    }
                                  }}
                                >
                                  Account
                                </button>
                                <button className="btn btn-sm btn-outline-primary" style={{ minWidth: 60 }} onClick={() => { setEditId(row.id); setShowEditModal(true); }}>Edit</button>
                                <button className="btn btn-sm btn-outline-danger" style={{ minWidth: 60 }} onClick={() => { setDeleteId(row.id); setShowDeleteModal(true); }}>Delete</button>
                              </div>
                            </td>
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
      {/* Delete Modal as component */}
      <DeleteModal
        show={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteId(null); }}
        onDelete={handleDelete}
        loading={deleteLoading}
        error={deleteError}
        professor={selectedProfessor}
      />
      <EditModal
        show={showEditModal}
        onClose={() => { setShowEditModal(false); setEditId(null); }}
        onSuccess={fetchProfessors}
        professor={editProfessor}
        departments={departments}
      />
      <AccountModal
        show={showAccountModal}
        onClose={() => { setShowAccountModal(false); setAccountProfessor(null); }}
        professor={accountProfessor}
        onSuccess={fetchProfessors}
      />
      {/* Account-exists warning modal */}
      {showAccountExistsModal && accountExistsProfessor && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0006', zIndex: 1600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, minWidth: 360, boxShadow: '0 2px 24px #0003' }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Account Already Created</div>
            <div style={{ marginBottom: 12 }}>
              <div><strong>Name:</strong> {accountExistsProfessor.first_name} {accountExistsProfessor.middle_name ?? ''} {accountExistsProfessor.last_name}</div>
              <div><strong>Email:</strong> {accountExistsProfessor.email ?? '-'}</div>
              <div style={{ color: '#666', marginTop: 8 }}>An account already exists for this professor's email.</div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => { setShowAccountExistsModal(false); setAccountExistsProfessor(null); }}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;