import React, { useState, useEffect } from 'react';

interface EditModalProps {
  show: boolean;
  onClose: () => void;
  onUpdate: (newName: string) => void;
  officeName?: string;
}

const EditModal: React.FC<EditModalProps> = ({ show, onClose, onUpdate, officeName }) => {
  const [newName, setNewName] = useState(officeName || '');

  useEffect(() => {
    setNewName(officeName || '');
  }, [officeName, show]);

  if (!show) return null;
  return (
    <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Office</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={e => { e.preventDefault(); onUpdate(newName); }}>
            <div className="modal-body">
              <label className="form-label">Office Name</label>
              <input
                type="text"
                className="form-control"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button type="submit" className="btn btn-success">Update</button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
