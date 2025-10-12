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
  const router = useRouter();
  const tableRef = useRef<HTMLTableElement | null>(null);

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/api/office_visits`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } });
        const text = await res.text();
        if (!res.ok) throw new Error(`Fetch failed: ${text}`);
        if (text.trim().startsWith('<!DOCTYPE html>')) throw new Error('Received HTML instead of JSON from API');
        const rows: OfficeVisitRow[] = JSON.parse(text || '[]');

        let filtered = rows;
        if (filter === 'today') {
          const { start, end } = getManilaDayRange(todayManila);
          filtered = rows.filter(r => (r.createdAt ?? '') >= start && (r.createdAt ?? '') <= end);
        } else if (filter === 'month') {
          const start = getManilaDayRange(monthStartManila).start;
          const end = getManilaDayRange(monthEndManila).end;
          filtered = rows.filter(r => (r.createdAt ?? '') >= start && (r.createdAt ?? '') <= end);
        } else if (filter === 'range' && dateFrom && dateTo) {
          const from = new Date(dateFrom + 'T00:00:00');
          const to = new Date(dateTo + 'T00:00:00');
          const start = getManilaDayRange(from).start;
          const end = getManilaDayRange(to).end;
          filtered = rows.filter(r => (r.createdAt ?? '') >= start && (r.createdAt ?? '') <= end);
        }

        const [officeRes, profRes] = await Promise.all([
          fetch(`${apiBase}/api/offices`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } }).then(r => r.text()).then(t => { try { return JSON.parse(t); } catch { return []; } }).catch(() => []),
          fetch(`${apiBase}/api/professors`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } }).then(r => r.text()).then(t => { try { return JSON.parse(t); } catch { return []; } }).catch(() => []),
        ]);

        const officeMap: Record<string, any> = {};
        if (Array.isArray(officeRes)) officeRes.forEach((o: any) => { officeMap[String(o.id)] = o; });
        const profMap: Record<string, any> = {};
        if (Array.isArray(profRes)) profRes.forEach((p: any) => { profMap[String(p.id)] = p; });

        const groups: Record<string, GroupedVisit> = {};
        for (const r of filtered) {
          const visitorsID = r.visitorsID;
          const manilaDate = new Date(new Date(r.createdAt ?? '').toLocaleString('en-US', { timeZone: 'Asia/Manila' })).toISOString().slice(0, 10);
          const key = `${visitorsID}__${manilaDate}`;
          if (!groups[key]) groups[key] = { visitorsID, date: manilaDate, offices: [], visitor: String(visitorsID) };
          groups[key].offices.push({
            dept_id: r.dept_id,
            office: officeMap[String(r.dept_id)] ? (officeMap[String(r.dept_id)].department || officeMap[String(r.dept_id)].name) : String(r.dept_id ?? ''),
            prof_id: r.prof_id,
            professor: formatFullName(profMap[String(r.prof_id)]) || '',
            purpose: r.purpose,
            createdAt: r.createdAt,
            qr_tagged: (r as any).qr_tagged ?? null,
          });
        }

        const groupedArray = Object.values(groups);

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
          if (name) {
            g.visitor = name;
          } else {
            // helpful debug output in browser console to inspect shape
            if (v) console.warn(`No formatted name for visitorsID=${g.visitorsID}`, v);
          }
          // compute tagged status for the grouped visit
          g.tagged = g.offices.some(o => o.qr_tagged === true);
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
      const exportData = data.flatMap(g => g.offices.map(o => ({ 'Visitor ID': g.visitorsID, 'Name': g.visitor || '', 'Date': g.date, 'Office': o.office, 'Professor': o.professor || '', 'Purpose': o.purpose || '', 'Time': o.createdAt ? toManilaDateTime(o.createdAt) : '' })));
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
      const exportData = data.flatMap(g => g.offices.map(o => [g.visitorsID, g.visitor || '', g.date, o.office, o.professor || '', o.purpose || '', o.createdAt ? toManilaDateTime(o.createdAt) : '']));
      autoTable(doc, { head: [['Visitor ID','Name','Date','Office','Professor','Purpose','Time']], body: exportData }); doc.save('office_visits_report.pdf'); setShowActions(true);
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

              <div style={{ maxHeight: 420, overflowY: 'auto', borderRadius: 12 }}>
                <table ref={tableRef} style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ color: '#888', fontWeight: 600, fontSize: 15, textAlign: 'left' }}>
                      <th style={{ padding: '16px 8px' }}>Visitor ID</th>
                      <th style={{ padding: '16px 8px' }}>Name</th>
                      <th style={{ padding: '16px 8px' }}>Date</th>
                      <th style={{ padding: '16px 8px' }}>Offices / Professors</th>
                      <th style={{ padding: '16px 8px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((g, idx) => (
                      <tr key={`${g.visitorsID}-${g.date}-${idx}`} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => { setSelectedGroup(g); }}>
                        <td style={{ padding: '14px 8px', color: '#bdbdbd', fontWeight: 500 }}>{g.visitorsID}</td>
                        <td style={{ padding: '14px 8px', color: '#222', fontWeight: 500 }}>{g.visitor ?? g.visitorsID}</td>
                        <td style={{ padding: '14px 8px', color: '#666' }}>{g.date}</td>
                        <td style={{ padding: '14px 8px' }}>
                          {g.offices.map((o, oi) => (
                            <div key={oi} style={{ marginBottom: 6 }}>
                              <strong>{o.office}</strong>{o.professor ? ` — ${o.professor}` : ''}
                              <div style={{ color: '#666', fontSize: 13 }}>{o.purpose || ''}</div>
                            </div>
                          ))}
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
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
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
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
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
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedGroup(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Table;