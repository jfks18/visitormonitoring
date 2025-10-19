import React, { useEffect, useState } from 'react';
import { toManilaDateTime } from '../../../lib/manila';

interface Service {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
  department_id?: number;
}

interface OfficeOption {
  id: number;
  name: string; // department name
}

const Table = () => {
  const [data, setData] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);

  // Offices (Departments)
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [officesLoading, setOfficesLoading] = useState(false);
  const [officesError, setOfficesError] = useState<string | null>(null);

  // Create form: selected department id
  const [createDeptId, setCreateDeptId] = useState<number | ''>('');

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';

  useEffect(() => {
    fetchServices();
    fetchOffices();
  }, []);

  const parseJsonSafe = (text: string) => {
    try { return JSON.parse(text); } catch { return undefined; }
  };

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/services`, {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'Failed to fetch services');
      if (text.trim().startsWith('<!DOCTYPE html>')) throw new Error('Received HTML instead of JSON. Backend may be down.');
      const json = parseJsonSafe(text);
      const rows = Array.isArray(json) ? json : [];
      setData(rows.map((r: any) => ({
        id: r.id,
        name: r.name || r.service || r.service_name || r.srvc_name || '',
        description: r.description || r.service_description || r.desc,
        createdAt: r.createdAt || r.created_at,
        department_id: r.department_id ?? r.departmentId ?? r.office_id ?? r.officeId ?? r.dept_id,
      })));
    } catch (err: any) {
      setError(err.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const fetchOffices = async () => {
    setOfficesLoading(true);
    setOfficesError(null);
    try {
      const res = await fetch(`${API_BASE}/api/offices`, {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'Failed to fetch offices');
      if (text.trim().startsWith('<!DOCTYPE html>')) throw new Error('Received HTML instead of JSON. Backend may be down.');
      const json = parseJsonSafe(text);
      const rows = Array.isArray(json) ? json : [];
      const opts: OfficeOption[] = rows.map((r: any) => ({ id: r.id, name: r.department || r.name || '' }));
      setOffices(opts.filter(o => !!o.name));
    } catch (err: any) {
      setOfficesError(err.message || 'Failed to load offices');
    } finally {
      setOfficesLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!serviceName.trim()) {
      setSubmitError('Service name is required.');
      return;
    }
    if (createDeptId === '' || createDeptId === undefined || createDeptId === null) {
      setSubmitError('Department is required.');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ srvc_name: serviceName.trim(), dept_id: createDeptId, ...(serviceDescription.trim() ? { description: serviceDescription.trim() } : {}) })
      });
      const text = await res.text();
      const json = parseJsonSafe(text);
      if (!res.ok) throw new Error((json && (json.message || json.error)) || text || 'Failed to create service');
      setShowModal(false);
      setServiceName('');
      setServiceDescription('');
      setCreateDeptId('');
      fetchServices();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create service');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteService = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/services/${id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'Failed to delete service');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchServices();
    } catch (err: any) {
      alert(err.message || 'Failed to delete service');
    }
  };

  const handleUpdateService = async (id: number, newName: string, newDesc?: string, newDeptId?: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ srvc_name: newName, dept_id: newDeptId, ...(newDesc ? { description: newDesc } : {}) })
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'Failed to update service');
      setShowEditModal(false);
      setEditTarget(null);
      fetchServices();
    } catch (err: any) {
      alert(err.message || 'Failed to update service');
    }
  };

  return (
    <div style={{ padding: '0', background: 'none' }}>
      <div style={{
        background: '#fff',
        borderRadius: 22,
        boxShadow: '0 2px 16px #0001',
        maxWidth: 900,
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
            <span style={{ marginRight: 12 }}>Services</span>
            <i className="bi bi-list-task" style={{ color: '#22577A', fontSize: 20 }}></i>
          </div>
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
            <i className="bi bi-plus-lg me-2"></i> Create Service
          </button>
        </div>
        <div style={{ padding: '0 32px' }}>
          {loading && <div className="text-center py-4"><span className="spinner-border text-primary" role="status"></span></div>}
          {error && <div className="alert alert-danger text-center">{error}</div>}
          {!loading && !error && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ maxHeight: 350, overflowY: 'auto', borderRadius: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'none' }}>
                  <thead>
                    <tr style={{ color: '#888', fontWeight: 600, fontSize: 15, border: 'none', textAlign: 'left' }}>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Service Name</th>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Department</th>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Description</th>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Created At</th>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s', background: 'none', textAlign: 'left' }}>
                        <td style={{ padding: '14px 8px', color: '#22577A', fontWeight: 600, textAlign: 'left' }}>{row.name}</td>
                        <td style={{ padding: '14px 8px', textAlign: 'left' }}>{(offices.find(o => o.id === row.department_id)?.name) || '-'}</td>
                        <td style={{ padding: '14px 8px', textAlign: 'left' }}>{row.description || '-'}</td>
                        <td style={{ padding: '14px 8px', color: '#bdbdbd', fontWeight: 500, textAlign: 'left' }}>{row.createdAt ? toManilaDateTime(row.createdAt) : '-'}</td>
                        <td style={{ padding: '14px 8px', textAlign: 'left' }}>
                          <button className="btn btn-sm btn-outline-primary me-2" onClick={() => { setEditTarget(row); setShowEditModal(true); }}>Edit</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => { setDeleteTarget({ id: row.id, name: row.name }); setShowDeleteModal(true); }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#888', padding: '24px 0' }}>No services found.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Service Modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Service</h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); setServiceName(''); setServiceDescription(''); setSubmitError(''); }}></button>
              </div>
              <form onSubmit={handleCreateService}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Service Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={serviceName}
                      onChange={e => setServiceName(e.target.value)}
                      placeholder="Enter service name"
                      autoFocus
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Department</label>
                    <select
                      className="form-select"
                      value={createDeptId === '' ? '' : String(createDeptId)}
                      onChange={e => {
                        const v = e.target.value;
                        setCreateDeptId(v === '' ? '' : Number(v));
                      }}
                    >
                      <option value="">Select department</option>
                      {offices.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    {officesError && <div className="text-danger small mt-1">{officesError}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      value={serviceDescription}
                      onChange={e => setServiceDescription(e.target.value)}
                      placeholder="Optional description"
                      rows={3}
                    />
                  </div>
                  {submitError && <div className="alert alert-danger py-1 my-2">{submitError}</div>}
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-success" disabled={submitLoading}>
                    {submitLoading ? 'Saving...' : 'Submit'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setServiceName(''); setServiceDescription(''); setSubmitError(''); }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Service</h5>
                <button type="button" className="btn-close" onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}></button>
              </div>
              <div className="modal-body">
                Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
              </div>
              <div className="modal-footer">
                <button className="btn btn-danger" onClick={() => deleteTarget && handleDeleteService(deleteTarget.id)}>Delete</button>
                <button className="btn btn-secondary" onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && editTarget && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Service</h5>
                <button type="button" className="btn-close" onClick={() => { setShowEditModal(false); setEditTarget(null); }}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Service Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editTarget.name}
                    onChange={e => setEditTarget({ ...editTarget, name: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    value={editTarget.description || ''}
                    onChange={e => setEditTarget({ ...editTarget, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-success" onClick={() => editTarget && handleUpdateService(
                  editTarget.id,
                  editTarget.name.trim(),
                  (editTarget.description || '').trim(),
                  editTarget.department_id
                )}>Save</button>
                <button className="btn btn-secondary" onClick={() => { setShowEditModal(false); setEditTarget(null); }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showEditModal && editTarget && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Service Department</h5>
                <button type="button" className="btn-close" onClick={() => { setShowEditModal(false); setEditTarget(null); }}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Department</label>
                  <select
                    className="form-select"
                    value={editTarget.department_id ? String(editTarget.department_id) : ''}
                    onChange={e => setEditTarget({ ...editTarget!, department_id: e.target.value ? Number(e.target.value) : undefined })}
                  >
                    <option value="">Select department</option>
                    {offices.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-success" onClick={() => editTarget && handleUpdateService(
                  editTarget.id,
                  editTarget.name.trim(),
                  (editTarget.description || '').trim(),
                  editTarget.department_id
                )}>Save</button>
                <button className="btn btn-secondary" onClick={() => { setShowEditModal(false); setEditTarget(null); }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
