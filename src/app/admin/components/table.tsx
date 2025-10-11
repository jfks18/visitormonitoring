'use client';
import React, { useEffect, useState, useRef } from 'react';
import { toManilaDateTime } from '../../../lib/manila';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';

interface Visitor {
  visitorsID: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  purpose: string;
  faculty_to_visit: string[];
  logid: number;
  timeIn: string | null;
  timeOut: string | null;
  logCreatedAt: string;
}

const Table = () => {
  const [data, setData] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pendingDateFrom, setPendingDateFrom] = useState('');
  const [pendingDateTo, setPendingDateTo] = useState('');
  const [dateError, setDateError] = useState('');
  const [filter, setFilter] = useState<'today' | 'month' | 'range'>('today');
  const [showActions, setShowActions] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [rangeFetchTrigger, setRangeFetchTrigger] = useState(0);
  const router = useRouter();
  const tableRef = useRef<HTMLTableElement>(null);

  // Fetch today's and this month's visitors count for summary cards
  const [todayCount, setTodayCount] = useState<number>(0);
  const [monthCount, setMonthCount] = useState<number>(0);
  const [summaryLoading, setSummaryLoading] = useState(true);
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const monthEndStr = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
    Promise.all([
  fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/visitors?createdAt=${todayStr}`, {
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      }).then(res => res.json()),
  fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/visitors?startDate=${monthStartStr}&endDate=${monthEndStr}`, {
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      }).then(res => res.json())
    ]).then(([todayData, monthData]) => {
      setTodayCount(Array.isArray(todayData) ? todayData.length : 0);
      setMonthCount(Array.isArray(monthData) ? monthData.length : 0);
      setSummaryLoading(false);
    }).catch(() => setSummaryLoading(false));
  }, []);

  // Helper to get today's date in yyyy-mm-dd
  const todayStr = new Date().toISOString().slice(0, 10);
  // Helper to get first and last day of this month
  const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const monthEndStr = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  // Helper to format time as AM/PM
  function formatTime(timeStr: string | null) {
    if (!timeStr) return '-';
    // Handles HH:mm:ss or HH:mm
    const [h, m, s] = timeStr.split(':');
    let hour = parseInt(h, 10);
    const minute = m;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${ampm}`;
  }

  // Helper to get Manila date string in yyyy-mm-dd
  function getManilaDateString(date: Date) {
    return date.toLocaleString('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).slice(0, 10);
  }
  // Helper to get start/end of Manila day in UTC ISO string
  function getManilaDayRange(date: Date) {
    // Get Manila midnight
    const manila = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    manila.setHours(0, 0, 0, 0);
    const start = new Date(manila.getTime() - (manila.getTimezoneOffset() * 60000));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // Manila date helpers
  const todayManila = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const todayManilaStr = getManilaDateString(todayManila);
  const monthStartManila = new Date(todayManila.getFullYear(), todayManila.getMonth(), 1);
  const monthEndManila = new Date(todayManila.getFullYear(), todayManila.getMonth() + 1, 0);
  const monthStartManilaStr = getManilaDateString(monthStartManila);
  const monthEndManilaStr = getManilaDateString(monthEndManila);

  useEffect(() => {
  let url = `${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/visitors`;
    if (filter === 'today') {
      url += `?startDate=${getManilaDayRange(todayManila).start}&endDate=${getManilaDayRange(todayManila).end}`;
    } else if (filter === 'month') {
      url += `?startDate=${getManilaDayRange(monthStartManila).start}&endDate=${getManilaDayRange(monthEndManila).end}`;
    } else if (filter === 'range') {
      if (dateFrom && dateTo) {
        // Use Manila time for range
        const from = new Date(dateFrom + 'T00:00:00');
        const to = new Date(dateTo + 'T00:00:00');
        url += `?startDate=${getManilaDayRange(from).start}&endDate=${getManilaDayRange(to).end}`;
      } else {
        return; // Don't fetch if dates are missing
      }
    }
    setLoading(true);
    setError(null);
    fetch(url, {
      headers: {
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    })
      .then(async res => {
        const text = await res.text();
        if (!res.ok) {
          throw new Error('Failed to fetch: ' + text);
        }
        // Check if response is HTML (ngrok error page or similar)
        if (text.trim().startsWith('<!DOCTYPE html>')) {
          throw new Error('Received HTML instead of JSON. The backend may be down or the URL is incorrect.');
        }
        try {
          const json = JSON.parse(text);
          return json;
        } catch (e) {
          console.error('Non-JSON response:', text);
          throw new Error('Response is not valid JSON: ' + text);
        }
      })
      .then(setData)
      .catch(err => {
        setError(err.message);
        console.error('Fetch error:', err);
      })
      .finally(() => setLoading(false));
  }, [filter, todayStr, monthStartStr, monthEndStr, rangeFetchTrigger]);

  const handleRangeClick = () => {
    setPendingDateFrom(dateFrom);
    setPendingDateTo(dateTo);
    setShowModal(true);
    setDateError('');
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingDateFrom || !pendingDateTo) {
      setDateError('Please select both dates.');
      return;
    }
    if (pendingDateFrom > pendingDateTo) {
      setDateError('Please insert not before the first date');
      return;
    }
    setShowModal(false);
    setDateFrom(pendingDateFrom);
    setDateTo(pendingDateTo);
    setFilter('range');
    setRangeFetchTrigger(t => t + 1); // Always trigger fetch
  };

  const handleExportExcel = () => {
    setShowActions(false);
    setTimeout(() => {
      // Prepare data for Excel (exclude Actions column)
      const exportData = data.map(row => ({
        'Visitor ID': row.visitorsID,
        'Name': `${row.first_name} ${row.middle_name} ${row.last_name}`.replace(/  +/g, ' ').trim(),
        'Purpose': (row as any).purpose_of_visit ?? row.purpose ?? '',
        'Faculty to Visit': Array.isArray(row.faculty_to_visit) ? row.faculty_to_visit.join(', ') : row.faculty_to_visit,
        'Time In': formatTime(row.timeIn),
        'Time Out': formatTime(row.timeOut),
        'Log Date': row.logCreatedAt ? toManilaDateTime(row.logCreatedAt) : '-'
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Visitors');
      XLSX.writeFile(wb, 'visitors_report.xlsx');
      setShowActions(true);
    }, 100);
  };

  const handleExportPDF = async () => {
    setShowActions(false);
    setTimeout(async () => {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();
      const exportData = data.map(row => [
        row.visitorsID,
        `${row.first_name} ${row.middle_name} ${row.last_name}`.replace(/  +/g, ' ').trim(),
        (row as any).purpose_of_visit ?? row.purpose ?? '',
        Array.isArray(row.faculty_to_visit) ? row.faculty_to_visit.join(', ') : row.faculty_to_visit,
        formatTime(row.timeIn),
        formatTime(row.timeOut),
        row.logCreatedAt ? toManilaDateTime(row.logCreatedAt) : '-'
      ]);
      autoTable(doc, {
        head: [[
          'Visitor ID', 'Name', 'Purpose', 'Faculty to Visit', 'Time In', 'Time Out', 'Log Date'
        ]],
        body: exportData
      });
      doc.save('visitors_report.pdf');
      setShowActions(true);
    }, 100);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const paginatedData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const [search, setSearch] = useState('');

  // Filtered data based on search
  const filteredData = data.filter(row => {
    const name = `${row.first_name} ${row.middle_name} ${row.last_name}`.replace(/  +/g, ' ').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div style={{ padding: '0', background: 'none' }}>
      <div style={{
        background: '#fff',
        borderRadius: 22,
        boxShadow: '0 2px 16px #0001',
        maxWidth: 1200,
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
          justifyContent: 'flex-start'
        }}>
          <span style={{ marginRight: 12 }}>Visitation history</span>
          <i className="bi bi-graph-up" style={{ color: '#22577A', fontSize: 20 }}></i>
        </div>
        {/* Filter and Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 32px 0 32px', justifyContent: 'flex-start' }}>
          <button className="btn" style={{ background: '#e3f6fd', color: '#22577A', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 20px', boxShadow: '0 1px 4px #0001' }} onClick={() => setFilter('today')}>Today</button>
          <button className="btn" style={{ background: '#e3f6fd', color: '#22577A', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 20px', boxShadow: '0 1px 4px #0001' }} onClick={() => setFilter('month')}>Monthly</button>
          <button className="btn" style={{ background: '#e3f6fd', color: '#22577A', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 20px', boxShadow: '0 1px 4px #0001' }} onClick={handleRangeClick}>Date Range</button>
          <button className="btn" style={{ background: '#e3f6fd', color: '#22577A', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 20px', boxShadow: '0 1px 4px #0001' }} onClick={handleExportExcel}><i className="bi bi-file-earmark-excel me-1"></i>Export Excel</button>
          <button className="btn" style={{ background: '#e3f6fd', color: '#22577A', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 20px', boxShadow: '0 1px 4px #0001' }} onClick={handleExportPDF}><i className="bi bi-file-earmark-pdf me-1"></i>Export PDF</button>
          <button className="btn" style={{ background: '#e3f6fd', color: '#22577A', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 20px', boxShadow: '0 1px 4px #0001' }} onClick={() => {
            const printContents = tableRef.current?.outerHTML;
            const printWindow = window.open('', '', 'height=600,width=900');
            if (printWindow && printContents) {
              printWindow.document.write('<html><head><title>Print Table</title>');
              printWindow.document.write('<style>body{font-family:sans-serif;}table{width:100%;border-collapse:collapse;}th,td{padding:8px 6px;border:1px solid #eee;text-align:left;}th{background:#e3f6fd;}</style>');
              printWindow.document.write('</head><body>');
              printWindow.document.write(printContents);
              printWindow.document.write('</body></html>');
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
              printWindow.close();
            }
          }}><i className="bi bi-printer me-1"></i>Print</button>
        </div>
        <div style={{ padding: '0 32px' }}>
          {loading && <div className="text-center py-4"><span className="spinner-border text-primary" role="status"></span></div>}
          {error && <div className="alert alert-danger text-center">{error}</div>}
          {!loading && !error && (
            <div style={{ overflowX: 'auto' }}>
              {/* Search Bar */}
              <div style={{ padding: '12px 0 8px 0', display: 'flex', justifyContent: 'flex-end' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ maxWidth: 260, borderRadius: 8, border: '1px solid #e3f6fd', fontSize: 15 }}
                  placeholder="Search visitor name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div style={{ maxHeight: 350, overflowY: 'auto', borderRadius: 12 }}>
                <table ref={tableRef} style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'none' }}>
                  <thead>
                    <tr style={{ color: '#888', fontWeight: 600, fontSize: 15, border: 'none', textAlign: 'left' }}>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Visitor ID</th>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Purpose</th>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Faculty to Visit</th>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Time In</th>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Time Out</th>
                      <th style={{ padding: '16px 8px', border: 'none', background: 'none', fontWeight: 500, textAlign: 'left' }}>Log Date</th>
                      {showActions && <th style={{ border: 'none', background: 'none', textAlign: 'left' }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row) => (
                      <tr key={row.logid} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s', background: 'none', textAlign: 'left' }}>
                        <td style={{ padding: '14px 8px', color: '#bdbdbd', fontWeight: 500, textAlign: 'left' }}>{row.visitorsID}</td>
                        <td style={{ padding: '14px 8px', color: '#222', fontWeight: 500, whiteSpace: 'nowrap', textAlign: 'left' }}>
                          <i className="bi bi-people" style={{ color: '#22577A', marginRight: 8 }}></i>
                          {`${row.first_name} ${row.middle_name} ${row.last_name}`.replace(/  +/g, ' ').trim()}
                        </td>
                        <td style={{ padding: '14px 8px', color: '#bdbdbd', fontWeight: 500, textAlign: 'left' }}>{(row as any).purpose_of_visit ?? row.purpose ?? ''}</td>
                        <td style={{ padding: '14px 8px', color: '#bdbdbd', fontWeight: 500, textAlign: 'left' }}>{Array.isArray(row.faculty_to_visit)
                          ? row.faculty_to_visit.map((f: any) =>
                              f && typeof f === 'object'
                                ? `${f.office}${f.professor ? ': ' + f.professor : ''}`
                                : f
                            ).map((item: string, idx: number, arr: string[]) => (
                              <div key={idx}>{item}</div>
                            ))
                          : row.faculty_to_visit}
                        </td>
                        <td style={{ padding: '14px 8px', color: '#bdbdbd', fontWeight: 500, textAlign: 'left' }}>{formatTime(row.timeIn)}</td>
                        <td style={{ padding: '14px 8px', color: '#bdbdbd', fontWeight: 500, textAlign: 'left' }}>{formatTime(row.timeOut)}</td>
                        <td style={{ padding: '14px 8px', color: '#bdbdbd', fontWeight: 500, textAlign: 'left' }}>{row.logCreatedAt ? toManilaDateTime(row.logCreatedAt) : '-'}</td>
                        <td style={{ padding: '14px 8px', textAlign: 'left' }}>
                          <button className="btn btn-link p-0" style={{ color: '#22577A' }} title="Print Visitor Pass" onClick={() => router.push(`/registration/print?visitorID=${row.visitorsID}`)}>
                            <i className="bi bi-printer" style={{ fontSize: 18 }}></i>
                          </button>
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'left' }}>
                          <button className="btn btn-outline-primary btn-sm" onClick={() => router.push(`/registration/print?visitorID=${row.visitorsID}`)}>
                            Generate QR Code
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredData.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#888', padding: '24px 0' }}>No visitors found.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Modal for date range selection */}
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
                    <input type="date" className="form-control" value={pendingDateFrom} onChange={e => setPendingDateFrom(e.target.value)} max={pendingDateTo || undefined} />
                  </div>
                  <div className="mb-2">
                    <label>To:</label>
                    <input type="date" className="form-control" value={pendingDateTo} onChange={e => setPendingDateTo(e.target.value)} min={pendingDateFrom || undefined} />
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
    </div>
  );
};

export default Table;