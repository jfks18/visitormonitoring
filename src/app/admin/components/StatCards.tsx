"use client";
import React, { useEffect, useState } from 'react';
import { toManilaDateTime } from '../../../lib/manila';

interface Visitor {
  visitorsID: string;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  purpose?: string;
  faculty_to_visit?: any;
  timeIn?: string | null;
  timeOut?: string | null;
  logCreatedAt?: string;
}

const StatCards = () => {
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [monthCount, setMonthCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [visitorsError, setVisitorsError] = useState<string | null>(null);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const monthEndStr = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
    setLoading(true);
    Promise.all([
  fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/visitors?createdAt=${todayStr}`, {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      }).then(res => res.json()),
  fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/visitors?startDate=${monthStartStr}&endDate=${monthEndStr}`, {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      }).then(res => res.json())
    ]).then(([todayData, monthData]) => {
      setTodayCount(Array.isArray(todayData) ? todayData.length : 0);
      setMonthCount(Array.isArray(monthData) ? monthData.length : 0);
      setLoading(false);
    }).catch(() => {
      setTodayCount(null);
      setMonthCount(null);
      setLoading(false);
    });
  }, []);

  function formatTime(timeStr: string | null | undefined) {
    if (!timeStr) return '-';
    const [h, m] = (timeStr || '').split(':');
    if (!h) return timeStr;
    let hour = parseInt(h, 10);
    const minute = m || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${ampm}`;
  }

  async function loadVisitors(mode: 'today' | 'month') {
    setVisitors([]);
    setVisitorsError(null);
    setVisitorsLoading(true);
    setShowModal(true);
    setModalTitle(mode === 'today' ? 'Today — Visitors' : 'This Month — Visitors');
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
      const monthEndStr = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
      const url = mode === 'today'
        ? `${apiBase}/api/visitors?createdAt=${todayStr}`
        : `${apiBase}/api/visitors?startDate=${monthStartStr}&endDate=${monthEndStr}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } });
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'Failed to fetch visitors');
      if (text.trim().startsWith('<!DOCTYPE html>')) throw new Error('Received HTML instead of JSON');
      const data = JSON.parse(text) as Visitor[];
      setVisitors(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Load visitors error:', err);
      setVisitorsError(err.message || String(err));
    } finally {
      setVisitorsLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      gap: 32,
      padding: '32px 0 0 40px',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    }}>
      <div onClick={() => loadVisitors('today')} style={{
        background: '#FFFDD0',
        borderRadius: 18,
        boxShadow: '0 2px 12px #0001',
        padding: '28px 32px',
        minWidth: 170,
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        flex: 1,
        maxWidth: 220,
        cursor: 'pointer'
      }}>
        <div style={{ color: '#1877F2', fontWeight: 700, fontSize: 32 }}>
          {loading ? '...' : todayCount}
        </div>
        <div style={{ color: '#bdbdbd', fontSize: 15, fontWeight: 500 }}>Today</div>
        <div style={{ color: '#222', fontWeight: 600, fontSize: 16, marginTop: 8 }}>Visitors</div>
      </div>
      <div onClick={() => loadVisitors('month')} style={{
        background: '#FFFDD0',
        borderRadius: 18,
        boxShadow: '0 2px 12px #0001',
        padding: '28px 32px',
        minWidth: 170,
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        flex: 1,
        maxWidth: 220,
        cursor: 'pointer'
      }}>
        <div style={{ color: '#1877F2', fontWeight: 700, fontSize: 32 }}>
          {loading ? '...' : monthCount}
        </div>
        <div style={{ color: '#bdbdbd', fontSize: 15, fontWeight: 500 }}>This Month</div>
        <div style={{ color: '#222', fontWeight: 600, fontSize: 16, marginTop: 8 }}>Visitors</div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex={-1}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modalTitle}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                {visitorsLoading && <div className="text-center py-3"><span className="spinner-border text-primary" role="status"></span></div>}
                {visitorsError && <div className="alert alert-danger">{visitorsError}</div>}
                {!visitorsLoading && !visitorsError && (
                  <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Visitor ID</th>
                          <th>Name</th>
                          <th>Purpose</th>
                          <th>Faculty to Visit</th>
                          <th>Time In</th>
                          <th>Time Out</th>
                          <th>Log Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitors.map((v) => (
                          <tr key={v.visitorsID}>
                            <td>{v.visitorsID}</td>
                            <td>{`${v.first_name} ${v.middle_name || ''} ${v.last_name || ''}`.replace(/  +/g, ' ').trim()}</td>
                            <td>{(v as any).purpose_of_visit ?? v.purpose ?? ''}</td>
                            <td>{Array.isArray(v.faculty_to_visit) ? v.faculty_to_visit.map((f:any)=> typeof f === 'object' ? (f.professor ? `${f.office}: ${f.professor}` : f.office) : f).join(', ') : JSON.stringify(v.faculty_to_visit)}</td>
                            <td>{formatTime(v.timeIn ?? null)}</td>
                            <td>{formatTime(v.timeOut ?? null)}</td>
                            <td>{v.logCreatedAt ? toManilaDateTime(v.logCreatedAt) : '-'}</td>
                          </tr>
                        ))}
                        {visitors.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center text-muted">No visitors found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatCards;
