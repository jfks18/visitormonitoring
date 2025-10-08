import React from 'react';

interface DeleteModalProps {
  show: boolean;
  onClose: () => void;
  onDelete: () => void;
  loading: boolean;
  error?: string;
  professor?: {
    first_name: string;
    middle_name: string;
    last_name: string;
  };
}

const DeleteModal: React.FC<DeleteModalProps> = ({ show, onClose, onDelete, loading, error, professor }) => {
  if (!show || !professor) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 320, boxShadow: '0 2px 16px #0002', textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Delete Staff</div>
        <div style={{ color: '#444', marginBottom: 24 }}>Are you sure you want to delete <b>{professor.first_name} {professor.middle_name} {professor.last_name}</b>?</div>
        {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="btn btn-danger" style={{ minWidth: 120 }} onClick={onDelete} disabled={loading}>
            {loading ? 'Deleting...' : 'Yes, I want to delete'}
          </button>
          <button className="btn btn-secondary" style={{ minWidth: 120 }} onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
