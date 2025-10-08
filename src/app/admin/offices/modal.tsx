import React from 'react';

interface DeleteModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  officeName?: string;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ show, onClose, onConfirm, officeName }) => {
  if (!show) return null;
  return (
    <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Delete Office</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p>Are you sure you want to delete this department/office{officeName ? `: ${officeName}` : ''}?</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-danger" onClick={onConfirm}>Yes, Delete</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
