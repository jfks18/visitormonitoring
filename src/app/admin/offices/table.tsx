import React, { useEffect, useState } from 'react';
import DeleteModal from './modal';
import EditModal from './editmodal';

interface Office {
  id: number;
  name: string;
  description: string;
  createdAt: string;
}

const Table = () => {
  const [data, setData] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [department, setDepartment] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = () => {
    setLoading(true);
    setError(null);
    fetch('https://gleesome-feracious-noelia.ngrok-free.dev/api/offices', {
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
        // Map department to name for compatibility
        setData(Array.isArray(rows) ? rows.map((row: any) => ({
          ...row,
          name: row.department || row.name || '',
        })) : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleCreateOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!department.trim()) {
      setSubmitError('Office name is required.');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await fetch('https://buck-leading-pipefish.ngrok-free.app/api/offices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: department.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create office');
      setShowModal(false);
      setDepartment('');
      fetchOffices();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create office');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteOffice = async (id: number) => {
    try {
      const res = await fetch(`https://buck-leading-pipefish.ngrok-free.app/api/offices/${id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to delete office');
      }
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchOffices();
    } catch (err: any) {
      alert(err.message || 'Failed to delete office');
    }
  };

  const handleUpdateOffice = async (id: number, newName: string) => {
    try {
      const res = await fetch(`https://buck-leading-pipefish.ngrok-free.app/api/offices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ department: newName })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update office');
      }
      setShowEditModal(false);
      setEditTarget(null);
      fetchOffices();
    } catch (err: any) {
      alert(err.message || 'Failed to update office');
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
            <span style={{ marginRight: 12 }}>Offices</span>
            <i className="bi bi-building" style={{ color: '#22577A', fontSize: 20 }}></i>
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
            <i className="bi bi-plus-lg me-2"></i> Create Office
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
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Office Name</th>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Created At</th>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s', background: 'none', textAlign: 'left' }}>
                        <td style={{ padding: '14px 8px', color: '#22577A', fontWeight: 600, textAlign: 'left' }}>{row.name}</td>
                        <td style={{ padding: '14px 8px', color: '#bdbdbd', fontWeight: 500, textAlign: 'left' }}>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</td>
                        <td style={{ padding: '14px 8px', textAlign: 'left' }}>
                          <button className="btn btn-sm btn-outline-primary me-2" onClick={() => { setEditTarget(row); setShowEditModal(true); }}>Edit</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => { setDeleteTarget(row); setShowDeleteModal(true); }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#888', padding: '24px 0' }}>No offices found.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Modal for creating office */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Office</h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); setDepartment(''); setSubmitError(''); }}></button>
              </div>
              <form onSubmit={handleCreateOffice}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Office Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      placeholder="Enter office name"
                      autoFocus
                    />
                  </div>
                  {submitError && <div className="alert alert-danger py-1 my-2">{submitError}</div>}
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-success" disabled={submitLoading}>
                    {submitLoading ? 'Saving...' : 'Submit'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setDepartment(''); setSubmitError(''); }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Modal for deleting office */}
      <DeleteModal
        show={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
        onConfirm={() => deleteTarget && handleDeleteOffice(deleteTarget.id)}
        officeName={deleteTarget?.name}
      />
      {/* Modal for editing office */}
      <EditModal
        show={showEditModal}
        onClose={() => { setShowEditModal(false); setEditTarget(null); }}
        onUpdate={newName => editTarget && handleUpdateOffice(editTarget.id, newName)}
        officeName={editTarget?.name}
      />
    </div>
  );
};

export default Table;