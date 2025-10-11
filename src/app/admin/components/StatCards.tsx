"use client";
import React, { useEffect, useState } from 'react';
import { toManilaDateTime } from '../../../lib/manila';
import Table from './table';

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
  const [tableInitialFilter, setTableInitialFilter] = useState<'today' | 'month'>('today');

  useEffect(() => {
    // compute Manila day start/end in ISO so backend can filter by datetime range
    const manilaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const manilaStart = new Date(manilaNow);
    manilaStart.setHours(0, 0, 0, 0);
    const start = new Date(manilaStart.getTime() - (manilaStart.getTimezoneOffset() * 60000));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

    const monthStartLocal = new Date(manilaNow.getFullYear(), manilaNow.getMonth(), 1);
    monthStartLocal.setHours(0, 0, 0, 0);
    const monthStart = new Date(monthStartLocal.getTime() - (monthStartLocal.getTimezoneOffset() * 60000));
    const monthEndLocal = new Date(manilaNow.getFullYear(), manilaNow.getMonth() + 1, 0);
    monthEndLocal.setHours(23, 59, 59, 999);
    const monthEnd = new Date(monthEndLocal.getTime() - (monthEndLocal.getTimezoneOffset() * 60000));

    const todayStartIso = start.toISOString();
    const todayEndIso = end.toISOString();
    const monthStartIso = monthStart.toISOString();
    const monthEndIso = monthEnd.toISOString();

    setLoading(true);
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/visitors?startDate=${encodeURIComponent(todayStartIso)}&endDate=${encodeURIComponent(todayEndIso)}`, {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      }).then(res => res.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/visitors?startDate=${encodeURIComponent(monthStartIso)}&endDate=${encodeURIComponent(monthEndIso)}`, {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      }).then(res => res.json())
    ]).then(([todayData, monthData]) => {
      setTodayCount(Array.isArray(todayData) ? todayData.length : 0);
      setMonthCount(Array.isArray(monthData) ? monthData.length : 0);
      setLoading(false);
    }).catch((err) => {
      console.error('StatCards fetch error', err);
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

  function loadVisitors(mode: 'today' | 'month') {
    setModalTitle(mode === 'today' ? 'Today — Visitors' : 'This Month — Visitors');
    setTableInitialFilter(mode);
    setShowModal(true);
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
                        <div style={{ minHeight: '60vh' }}>
                          <Table initialFilter={tableInitialFilter} hideControls={true} />
                        </div>
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
