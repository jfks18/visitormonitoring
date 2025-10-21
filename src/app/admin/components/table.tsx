"use client";
import React, { useEffect, useState, useRef } from 'react';
import { toManilaDateTime } from '../../../lib/manila';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

type OfficeVisitRow = {
  logid?: number;
  visitorsID: string;
  dept_id?: number | string;
  prof_id?: number | string;
  purpose?: string;
  createdAt?: string;
  qr_tagged?: boolean | null;
};

type VisitorsLogRow = {
  visitorsID: string;
  createdAt?: string | null; // when the log row was created
  timeIn?: string | null;
  timeOut?: string | null;
  date?: string | null; // optional explicit date from API
  // allow any other fields but we don't rely on them here
  [key: string]: any;
};

type GroupedVisit = {
  visitorsID: string;
  date: string; // YYYY-MM-DD Manila
  visitor?: string | null;
  offices: Array<{
    dept_id?: number | string;
    office: string;
    prof_id?: number | string;
    professor?: string;
    purpose?: string;
    createdAt?: string;
    qr_tagged?: boolean | null;
  }>;
  tagged?: boolean; // any office tagged
  timeInISO?: string | null;
  timeOutISO?: string | null;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';

function formatFullName(person: any | null | undefined) {
  if (!person) return null;
  // If API provides a single full name field, use it
  const fullCandidates = ['full_name', 'fullname', 'name', 'fullName'];
  for (const key of fullCandidates) {
    if (person[key] && String(person[key]).trim() !== '') return String(person[key]).trim();
  }

  // Common alternatives for first/middle/last
  const first = person.first_name ?? person.firstName ?? person.firstname ?? person.fname ?? person.given_name;
  const middle = person.middle_name ?? person.middleName ?? person.middlename ?? person.mname;
  const last = person.last_name ?? person.lastName ?? person.lastname ?? person.lname ?? person.family_name;

  const parts = [first, middle, last].filter((p: any) => p && String(p).trim() !== '');
  return parts.length ? parts.join(' ') : null;
}

interface TableProps {
  initialFilter?: 'today' | 'month' | 'range' | 'all';
  hideControls?: boolean;
}

const Table: React.FC<TableProps> = ({ initialFilter = 'today', hideControls = false }) => {
  const [data, setData] = useState<GroupedVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'today' | 'month' | 'range' | 'all'>(initialFilter);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pendingDateFrom, setPendingDateFrom] = useState<string | null>(null);
  const [pendingDateTo, setPendingDateTo] = useState<string | null>(null);
  const [dateError, setDateError] = useState('');
  const [showActions, setShowActions] = useState(true);
  const [rangeFetchTrigger, setRangeFetchTrigger] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<GroupedVisit | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const router = useRouter();
  const tableRef = useRef<HTMLTableElement | null>(null);
  const openGroupModal = useOpenGroupModal(setSelectedGroup, setModalLoading, apiBase);

  const toManilaTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  function getManilaDayRange(date: Date) {
    const manila = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    manila.setHours(0, 0, 0, 0);
    const start = new Date(manila.getTime() - (manila.getTimezoneOffset() * 60000));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const todayManila = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const monthStartManila = new Date(todayManila.getFullYear(), todayManila.getMonth(), 1);
  const monthEndManila = new Date(todayManila.getFullYear(), todayManila.getMonth() + 1, 0);

  // Build a full ISO datetime in Manila (+08:00) from a YYYY-MM-DD and a time-like value
  const normalizeTimeOnDate = (dateYMD: string, timeLike?: string | null): string | null => {
    if (!timeLike) return null;
    const t = String(timeLike).trim();
    if (!t) return null;
    // If already a full datetime (contains 'T') or timezone, trust it
    if (/T/.test(t) || /Z|\+\d{2}:?\d{2}$/.test(t)) {
      const d = new Date(t);
      return isNaN(d.getTime()) ? null : t;
    }
    // Match HH:mm or HH:mm:ss (24h)
    const m = t.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (m) {
      const hh = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const ss = (m[3] ?? '00').padStart(2, '0');
      return `${dateYMD}T${hh}:${mm}:${ss}+08:00`;
    }
    // Try Date parsing as fallback
    const d2 = new Date(t);
    if (!isNaN(d2.getTime())) return d2.toISOString();
    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Build query for visitorslog
        const params = new URLSearchParams();
        if (filter === 'today') {
          // Use Manila date for createdAt
          const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
          const ymd = d.toISOString().slice(0,10);
          params.set('createdAt', ymd);
        } else if (filter === 'month') {
          const start = new Date(todayManila.getFullYear(), todayManila.getMonth(), 1);
          const end = new Date(todayManila.getFullYear(), todayManila.getMonth() + 1, 0);
          const ymd1 = new Date(start.toLocaleString('en-US', { timeZone: 'Asia/Manila' })).toISOString().slice(0,10);
          const ymd2 = new Date(end.toLocaleString('en-US', { timeZone: 'Asia/Manila' })).toISOString().slice(0,10);
          params.set('startDate', ymd1);
          params.set('endDate', ymd2);
        } else if (filter === 'range' && dateFrom && dateTo) {
          params.set('startDate', dateFrom);
          params.set('endDate', dateTo);
        }

        const url = `${apiBase}/api/visitorslog${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } });
        const text = await res.text();
        if (!res.ok) throw new Error(`Fetch failed: ${text}`);
        if (text.trim().startsWith('<!DOCTYPE html>')) throw new Error('Received HTML instead of JSON from API');
        const logs: VisitorsLogRow[] = JSON.parse(text || '[]');
        const arr = Array.isArray(logs) ? logs : [logs];

        // Helper: get Manila date string from any plausible field
        const toManilaDateOnly = (iso?: string | null) => {
          if (!iso) return null;
          try {
            const d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
            return d.toISOString().slice(0,10);
          } catch { return null; }
        };

        // Group by visitorsID + date (Manila) using createdAt/timeIn/timeOut to determine the date
        const groups: Record<string, GroupedVisit> = {};
        for (const r of arr) {
          const vid = String(r.visitorsID || '');
          if (!vid) continue;
          const dateKey = r.date || toManilaDateOnly(r.createdAt) || toManilaDateOnly(r.timeIn) || toManilaDateOnly(r.timeOut);
          if (!dateKey) continue;
          const key = `${vid}__${dateKey}`;
          if (!groups[key]) {
            groups[key] = { visitorsID: vid, date: dateKey, offices: [], visitor: vid, timeInISO: null, timeOutISO: null };
          }
          // Accumulate earliest timeIn and latest timeOut across rows of the same day
          const current = groups[key];
          const tInRaw = (r as any).timeIn ?? (r as any).time_in ?? null;
          const tOutRaw = (r as any).timeOut ?? (r as any).time_out ?? null;
          const tIn = normalizeTimeOnDate(dateKey, tInRaw);
          const tOut = normalizeTimeOnDate(dateKey, tOutRaw);
          if (tIn) {
            if (!current.timeInISO) current.timeInISO = tIn;
            else if (new Date(tIn).getTime() < new Date(current.timeInISO).getTime()) current.timeInISO = tIn;
          }
          if (tOut) {
            if (!current.timeOutISO) current.timeOutISO = tOut;
            else if (new Date(tOut).getTime() > new Date(current.timeOutISO).getTime()) current.timeOutISO = tOut;
          }
        }

        const groupedArray = Object.values(groups).sort((a,b) => (a.date < b.date ? 1 : -1));

        // Fetch visitor names once
        const uniqueVisitorIDs = Array.from(new Set(groupedArray.map(g => g.visitorsID)));
        const visitorMap: Record<string, any> = {};
        await Promise.all(uniqueVisitorIDs.map(async (vid) => {
          try {
            const vres = await fetch(`${apiBase}/api/visitorsdata/${encodeURIComponent(vid)}`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } });
            if (!vres.ok) { console.warn(`visitorsdata ${vid} returned status ${vres.status}`); return; }
            const vt = await vres.json().catch(() => null);
            if (vt) visitorMap[vid] = vt; else console.warn(`visitorsdata ${vid} returned empty/invalid JSON`);
          } catch { }
        }));

        groupedArray.forEach(g => {
          const v = visitorMap[g.visitorsID];
          const name = formatFullName(v);
          if (name) g.visitor = name;
        });

        setData(groupedArray);
      } catch (err: any) {
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filter, dateFrom, dateTo, rangeFetchTrigger]);

  const handleRangeClick = () => { setPendingDateFrom(dateFrom); setPendingDateTo(dateTo); setShowModal(true); setDateError(''); };
  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingDateFrom || !pendingDateTo) { setDateError('Please select both dates.'); return; }
    if (pendingDateFrom > pendingDateTo) { setDateError('Please ensure the first date is before the second date'); return; }
    setShowModal(false); setDateFrom(pendingDateFrom); setDateTo(pendingDateTo); setFilter('range'); setRangeFetchTrigger(t => t + 1);
  };

  const handleExportExcel = () => {
    setShowActions(false);
    setTimeout(() => {
  const exportData = data.flatMap(g => g.offices.map(o => ({ 'Visitor ID': g.visitorsID, 'Name': g.visitor || '', 'Time In': toManilaTime(g.timeInISO), 'Time Out': toManilaTime(g.timeOutISO), 'Date': g.date, 'Office': o.office, 'Professor': o.professor || '', 'Purpose': o.purpose || '', 'Time (Entry)': o.createdAt ? toManilaDateTime(o.createdAt) : '' })));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Visits'); XLSX.writeFile(wb, 'office_visits_report.xlsx'); setShowActions(true);
    }, 100);
  };

  const handleExportPDF = async () => {
    setShowActions(false);
    setTimeout(async () => {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();
  const exportData = data.flatMap(g => g.offices.map(o => [g.visitorsID, g.visitor || '', toManilaTime(g.timeInISO), toManilaTime(g.timeOutISO), g.date, o.office, o.professor || '', o.purpose || '', o.createdAt ? toManilaDateTime(o.createdAt) : '']));
  autoTable(doc, { head: [['Visitor ID','Name','Time In','Time Out','Date','Office','Professor','Purpose','Time (Entry)']], body: exportData }); doc.save('office_visits_report.pdf'); setShowActions(true);
    }, 100);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));

  const [search, setSearch] = useState('');
  const filteredData = data.filter(g => (String(g.visitor || g.visitorsID || '')).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: '0', background: 'none' }}>
      <div style={{ background: '#fff', borderRadius: 22, boxShadow: '0 2px 16px #0001', maxWidth: 1200, margin: '32px auto', padding: '0 0 24px 0', border: 'none', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '32px 32px 0 32px', fontWeight: 700, fontSize: 22, color: '#222' }}>
          <span style={{ marginRight: 12 }}>Visitation history</span>
          <i className="bi bi-graph-up" style={{ color: '#22577A', fontSize: 20 }}></i>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 32px 0 32px' }}>
          <button className="btn" style={{ background: '#e3f6fd', color: '#22577A', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 20px' }} onClick={() => setFilter('today')}>Today</button>
          <button className="btn" style={{ background: '#e3f6fd', color: '#22577A', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 20px' }} onClick={() => setFilter('month')}>Monthly</button>
          <button className="btn" style={{ background: '#e3f6fd', color: '#22577A', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 20px' }} onClick={handleRangeClick}>Date Range</button>
          <button className="btn" style={{ background: '#e3f6fd', color: '#22577A', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 20px' }} onClick={handleExportExcel}><i className="bi bi-file-earmark-excel me-1"></i>Export Excel</button>
          <button className="btn" style={{ background: '#e3f6fd', color: '#22577A', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 20px' }} onClick={handleExportPDF}><i className="bi bi-file-earmark-pdf me-1"></i>Export PDF</button>
        </div>

        <div style={{ padding: '0 32px' }}>
          {loading && <div className="text-center py-4"><span className="spinner-border text-primary" role="status"></span></div>}
          {error && <div className="alert alert-danger text-center">{error}</div>}
          {!loading && !error && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ padding: '12px 0 8px 0', display: 'flex', justifyContent: 'flex-end' }}>
                <input type="text" className="form-control" style={{ maxWidth: 260, borderRadius: 8, border: '1px solid #e3f6fd', fontSize: 15 }} placeholder="Search visitor name..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              <div className="main-table-scroll" style={{ borderRadius: 12 }}>
                <table ref={tableRef} style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ color: '#888', fontWeight: 600, fontSize: 15, textAlign: 'left' }}>
                      <th style={{ padding: '16px 8px' }}>Visitor ID</th>
                      <th style={{ padding: '16px 8px' }}>Name</th>
                      <th style={{ padding: '16px 8px' }}>Time In</th>
                      <th style={{ padding: '16px 8px' }}>Time Out</th>
                      <th style={{ padding: '16px 8px' }}>Date</th>
                      <th style={{ padding: '16px 8px' }}>Offices / Professors</th>
                      <th style={{ padding: '16px 8px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((g, idx) => (
                      <tr key={`${g.visitorsID}-${g.date}-${idx}`} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => { openGroupModal(g); }}>
                        <td style={{ padding: '14px 8px', color: '#bdbdbd', fontWeight: 500 }}>{g.visitorsID}</td>
                        <td style={{ padding: '14px 8px', color: '#222', fontWeight: 500 }}>{g.visitor ?? g.visitorsID}</td>
                        <td style={{ padding: '14px 8px', color: '#666' }}>{toManilaTime(g.timeInISO)}</td>
                        <td style={{ padding: '14px 8px', color: '#666' }}>{toManilaTime(g.timeOutISO)}</td>
                        <td style={{ padding: '14px 8px', color: '#666' }}>{g.date}</td>
                        <td style={{ padding: '14px 8px' }}>
                          {g.offices && g.offices.length > 0 ? (
                            g.offices.map((o, oi) => (
                              <div key={oi} style={{ marginBottom: 6 }}>
                                <strong>{o.office}</strong>{o.professor ? ` — ${o.professor}` : ''}
                                <div style={{ color: '#666', fontSize: 13 }}>{o.purpose || ''}</div>
                              </div>
                            ))
                          ) : (
                            <span style={{ color: '#999' }}>Click row to view details</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 8px' }}>
                          <button className="btn btn-link p-0" style={{ color: '#22577A' }} title="Print Visitor Pass" onClick={(e) => { e.stopPropagation(); router.push(`/registration/print?visitorID=${g.visitorsID}`); }}>
                            <i className="bi bi-printer" style={{ fontSize: 18 }}></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredData.length === 0 && <div style={{ textAlign: 'center', color: '#888', padding: '24px 0' }}>No visits found.</div>}
              </div>
              {MainTableScrollStyles}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Select Date Range</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleModalSubmit}>
                <div className="modal-body">
                  <div className="mb-2">
                    <label>From:</label>
                    <input type="date" className="form-control" value={pendingDateFrom ?? ''} onChange={e => setPendingDateFrom(e.target.value)} max={pendingDateTo ?? undefined} />
                  </div>
                  <div className="mb-2">
                    <label>To:</label>
                    <input type="date" className="form-control" value={pendingDateTo ?? ''} onChange={e => setPendingDateTo(e.target.value)} min={pendingDateFrom ?? undefined} />
                  </div>
                  {dateError && <div className="alert alert-danger py-1 my-2">{dateError}</div>}
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-success">Apply</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details modal for selected grouped visit */}
      {selectedGroup && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex={-1}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Visit details — {selectedGroup.visitorsID} ({selectedGroup.date})</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedGroup(null)}></button>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: 12 }}><strong>Visitor:</strong> {selectedGroup.visitor ?? selectedGroup.visitorsID}</div>
                {modalLoading ? (
                  <div className="text-center py-3"><span className="spinner-border text-primary" role="status"></span></div>
                ) : (
                  <div className="modal-table-scroll">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Office</th>
                          <th>Professor</th>
                          <th>Purpose</th>
                          <th>Time</th>
                          <th>QR Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGroup.offices.map((o, i) => (
                          <tr key={i}>
                            <td>{o.office}</td>
                            <td>{o.professor || ''}</td>
                            <td>{o.purpose || ''}</td>
                            <td>{o.createdAt ? toManilaDateTime(o.createdAt) : '-'}</td>
                            <td>{o.qr_tagged ? 'qr_tagged' : 'not visited'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedGroup(null)}>Close</button>
              </div>
              {ModalTableScrollStyles}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Table;

// Scoped styles for scrollable table area in modal
// Using styled-jsx to keep styles in this component file
// Ensures only the table region scrolls and header stays visible
// Adjust max-height as needed to fit your layout
// Note: Next.js supports global styles via globals.css; this is local to the component
// eslint-disable-next-line @next/next/no-sync-scripts
export const ModalTableScrollStyles = (
  <style jsx>{`
    .modal-table-scroll {
      max-height: 60vh;
      overflow-y: auto;
      padding-right: 4px;
    }
    .modal-table-scroll thead th {
      position: sticky;
      top: 0;
      background: #fff;
      z-index: 1;
    }
    /* Optional nicer scrollbar */
    .modal-table-scroll::-webkit-scrollbar { width: 8px; }
    .modal-table-scroll::-webkit-scrollbar-thumb { background: #cfd8dc; border-radius: 4px; }
    .modal-table-scroll::-webkit-scrollbar-track { background: transparent; }
  `}</style>
);

// Scoped styles for the main table scroll container
export const MainTableScrollStyles = (
  <style jsx>{`
    .main-table-scroll {
      max-height: 420px;
      overflow-y: auto;
    }
    .main-table-scroll thead th {
      position: sticky;
      top: 0;
      background: #fff;
      z-index: 2;
    }
    .main-table-scroll::-webkit-scrollbar { width: 8px; }
    .main-table-scroll::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 4px; }
    .main-table-scroll::-webkit-scrollbar-track { background: transparent; }
  `}</style>
);

// Helper to open modal and load office/professor details for a visitor on a given date
function openGroupModalFactory(
  setSelectedGroup: React.Dispatch<React.SetStateAction<GroupedVisit | null>>,
  setModalLoading: React.Dispatch<React.SetStateAction<boolean>>,
  apiBase: string
) {
  const toManilaDateOnly = (iso?: string | null) => {
    if (!iso) return null;
    try {
      const d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      return d.toISOString().slice(0,10);
    } catch { return null; }
  };

  return async (g: GroupedVisit) => {
    setSelectedGroup({ ...g, offices: [] });
    setModalLoading(true);
    try {
      // Fetch maps for offices and professors
      const [officeResText, profResText] = await Promise.all([
        fetch(`${apiBase}/api/offices`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } }).then(r => r.text()).catch(() => '[]'),
        fetch(`${apiBase}/api/professors`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } }).then(r => r.text()).catch(() => '[]'),
      ]);
      let officeRes: any[] = [];
      let profRes: any[] = [];
      try { officeRes = JSON.parse(officeResText || '[]'); } catch { officeRes = []; }
      try { profRes = JSON.parse(profResText || '[]'); } catch { profRes = []; }

      const officeMap: Record<string, any> = {};
      if (Array.isArray(officeRes)) officeRes.forEach((o: any) => { officeMap[String(o.id)] = o; });
      const profMap: Record<string, any> = {};
      if (Array.isArray(profRes)) profRes.forEach((p: any) => { profMap[String(p.id)] = p; });

      // Fetch office visits and filter by visitor/date
      const ovText = await fetch(`${apiBase}/api/office_visits`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } }).then(r => r.text());
      const rows: OfficeVisitRow[] = JSON.parse(ovText || '[]');

      const offices = rows
        .filter(r => String(r.visitorsID) === String(g.visitorsID))
        .filter(r => {
          const d = toManilaDateOnly(r.createdAt);
          return d === g.date;
        })
        .map(r => ({
          dept_id: r.dept_id,
          office: officeMap[String(r.dept_id)] ? (officeMap[String(r.dept_id)].department || officeMap[String(r.dept_id)].name) : String(r.dept_id ?? ''),
          prof_id: r.prof_id,
          professor: formatFullName(profMap[String(r.prof_id)]) || '',
          purpose: r.purpose,
          createdAt: r.createdAt,
          qr_tagged: (r as any).qr_tagged ?? null,
        }));

      setSelectedGroup({ ...g, offices });
    } catch (e) {
      console.error('Failed loading group details', e);
    } finally {
      setModalLoading(false);
    }
  };
}

// Create a bound handler inside component scope
function useOpenGroupModal(
  setSelectedGroup: React.Dispatch<React.SetStateAction<GroupedVisit | null>>,
  setModalLoading: React.Dispatch<React.SetStateAction<boolean>>,
  apiBase: string
) {
  const ref = React.useRef<ReturnType<typeof openGroupModalFactory> | null>(null);
  if (!ref.current) ref.current = openGroupModalFactory(setSelectedGroup, setModalLoading, apiBase);
  return ref.current!;
}