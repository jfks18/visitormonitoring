"use client";
import React, { useEffect, useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { toManilaDateTime } from '../../../lib/manila';
import * as XLSX from 'xlsx';

interface Visit {
  id: number;
  visitorsID: string;
  dept_id?: number;
  prof_id?: number;
  purpose?: string;
  createdAt?: string;
  qr_tagged?: number;
}

interface Visitor {
  visitorsID: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  full_name?: string;
  name?: string;
  [key: string]: any;
}

interface Professor {
  id: number;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  full_name?: string;
  name?: string;
  [key: string]: any;
}

const ReportsPage = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitors, setVisitors] = useState<Record<string, Visitor>>({});
  const [professors, setProfessors] = useState<Record<string, Professor>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'today' | 'month'>('today');
  const [exportLoading, setExportLoading] = useState(false);

  // Track Manila calendar day (YYYY-MM-DD) and auto-refresh at Manila midnight
  const getManilaYMD = () => {
    try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); }
    catch { return new Date().toISOString().slice(0, 10); }
  };
  const [manilaDay, setManilaDay] = useState<string>(getManilaYMD());
  
  useEffect(() => {
    const id = setInterval(() => {
      const ymd = getManilaYMD();
      setManilaDay(prev => (prev !== ymd ? ymd : prev));
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Get department ID from localStorage
  const getDepartmentId = (): number | null => {
    try {
      const rawDept = localStorage.getItem('departmentAuth');
      const rawAdmin = localStorage.getItem('adminAuth');
      const deptAuth = rawDept ? JSON.parse(rawDept) : null;
      const adminAuth = rawAdmin ? JSON.parse(rawAdmin) : null;
      
      const deptId = deptAuth?.dept_id ?? adminAuth?.dept_id ?? null;
      if (typeof deptId === 'number') return deptId;
      if (typeof deptId === 'string' && deptId) return Number(deptId);
      return null;
    } catch { 
      return null; 
    }
  };

  // Format full name helper
  const formatFullName = (person: any | null | undefined) => {
    if (!person) return null;
    const fullCandidates = ['full_name', 'fullname', 'name', 'fullName'];
    for (const key of fullCandidates) {
      if (person[key] && String(person[key]).trim() !== '') return String(person[key]).trim();
    }
    const first = person.first_name ?? person.firstName ?? person.firstname ?? person.fname ?? person.given_name;
    const middle = person.middle_name ?? person.middleName ?? person.middlename ?? person.mname;
    const last = person.last_name ?? person.lastName ?? person.lastname ?? person.lname ?? person.family_name;
    const parts = [first, middle, last].filter((p: any) => p && String(p).trim() !== '');
    return parts.length ? parts.join(' ') : null;
  };

  // Manila date helpers
  const toManilaYMD = (iso?: string | null): string | null => {
    if (!iso) return null;
    try { return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); }
    catch { return null; }
  };

  const todayYMD = manilaDay;
  const monthStartYMD = useMemo(() => {
    try {
      const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    } catch { return todayYMD; }
  }, [todayYMD]);
  
  const monthEndYMD = useMemo(() => {
    try {
      const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    } catch { return todayYMD; }
  }, [todayYMD]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      const deptId = getDepartmentId();
      if (!deptId) {
        setError('No department ID found in local storage.');
        setLoading(false);
        return;
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
      
      try {
        // Fetch office visits for this department
        const visitsRes = await fetch(`${apiBase}/api/office_visits`, {
          headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        });
        
        if (!visitsRes.ok) throw new Error('Failed to fetch visits');
        const visitsText = await visitsRes.text();
        let visitsData: Visit[] = [];
        try { 
          visitsData = JSON.parse(visitsText || '[]');
          if (!Array.isArray(visitsData)) visitsData = visitsData ? [visitsData] : [];
        } catch { visitsData = []; }

        // Filter visits by department
        const deptVisits = visitsData.filter(visit => Number(visit.dept_id) === deptId);
        setVisits(deptVisits);

        // Get unique visitor IDs and professor IDs
        const visitorIds = Array.from(new Set(deptVisits.map(v => v.visitorsID).filter(Boolean)));
        const profIds = Array.from(new Set(deptVisits.map(v => v.prof_id).filter(Boolean)));

        // Fetch visitor details
        const visitorMap: Record<string, Visitor> = {};
        await Promise.all(visitorIds.map(async (vid) => {
          try {
            const res = await fetch(`${apiBase}/api/visitorsdata/${encodeURIComponent(vid)}`, {
              headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }
            });
            if (res.ok) {
              const data = await res.json();
              if (data) visitorMap[vid] = data;
            }
          } catch { }
        }));
        setVisitors(visitorMap);

        // Fetch professor details
        const professorMap: Record<string, Professor> = {};
        await Promise.all(profIds.map(async (pid) => {
          try {
            const res = await fetch(`${apiBase}/api/professors`, {
              headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }
            });
            if (res.ok) {
              const data = await res.json();
              const professors = Array.isArray(data) ? data : [data];
              const prof = professors.find(p => Number(p.id) === Number(pid));
              if (prof) professorMap[String(pid)] = prof;
            }
          } catch { }
        }));
        setProfessors(professorMap);

      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [manilaDay]); // Reload when Manila day changes

  // Filter visits by date
  const filteredVisits = useMemo(() => {
    if (!visits || visits.length === 0) return [];
    
    try {
      const sorted = [...visits].sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });

      if (filter === 'today') {
        return sorted.filter(v => toManilaYMD(v.createdAt) === todayYMD);
      }
      
      // Monthly filter
      return sorted.filter(v => {
        const ymd = toManilaYMD(v.createdAt);
        return !!ymd && ymd >= monthStartYMD && ymd <= monthEndYMD;
      });
    } catch {
      return visits;
    }
  }, [visits, filter, todayYMD, monthStartYMD, monthEndYMD]);

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const exportData = filteredVisits.map(visit => ({
        'Visitor ID': visit.visitorsID,
        'Visitor Name': formatFullName(visitors[visit.visitorsID]) || visit.visitorsID,
        'Professor': formatFullName(professors[String(visit.prof_id)]) || visit.prof_id || '-',
        'Purpose': visit.purpose || '-',
        'Date/Time': visit.createdAt ? toManilaDateTime(visit.createdAt) : '-',
        'Status': visit.qr_tagged ? 'Tagged' : 'Pending'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Department Visits');
      XLSX.writeFile(wb, `department_visits_${filter}_${getManilaYMD()}.xlsx`);
    } catch (err) {
      alert('Failed to export Excel file');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      const exportData = filteredVisits.map(visit => [
        visit.visitorsID,
        formatFullName(visitors[visit.visitorsID]) || visit.visitorsID,
        formatFullName(professors[String(visit.prof_id)]) || visit.prof_id || '-',
        visit.purpose || '-',
        visit.createdAt ? toManilaDateTime(visit.createdAt) : '-',
        visit.qr_tagged ? 'Tagged' : 'Pending'
      ]);

      autoTable(doc, {
        head: [['Visitor ID', 'Visitor Name', 'Professor', 'Purpose', 'Date/Time', 'Status']],
        body: exportData,
        margin: { top: 20 }
      });
      
      doc.save(`department_visits_${filter}_${getManilaYMD()}.pdf`);
    } catch (err) {
      alert('Failed to export PDF file');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#e3f6fd' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 220, minHeight: '100vh' }}>
        <TopBar />
        <div style={{ padding: 32 }}>
          <div style={{
            background: '#fff',
            borderRadius: 22,
            boxShadow: '0 2px 16px #0001',
            maxWidth: 1200,
            margin: '0 auto',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24
            }}>
              <div style={{ fontWeight: 800, color: '#222', fontSize: 20 }}>
                Department Reports
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  className="btn"
                  style={{
                    background: filter === 'today' ? '#22577A' : '#e3f6fd',
                    color: filter === 'today' ? '#fff' : '#22577A',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px'
                  }}
                  onClick={() => setFilter('today')}
                >
                  Today
                </button>
                <button
                  className="btn"
                  style={{
                    background: filter === 'month' ? '#22577A' : '#e3f6fd',
                    color: filter === 'month' ? '#fff' : '#22577A',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px'
                  }}
                  onClick={() => setFilter('month')}
                >
                  Monthly
                </button>
                <div style={{ borderLeft: '1px solid #ddd', height: 32, margin: '0 8px' }}></div>
                <button
                  className="btn"
                  style={{
                    background: '#e3f6fd',
                    color: '#22577A',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px'
                  }}
                  onClick={handleExportExcel}
                  disabled={exportLoading}
                >
                  <i className="bi bi-file-earmark-excel me-1"></i>
                  Export Excel
                </button>
                <button
                  className="btn"
                  style={{
                    background: '#e3f6fd',
                    color: '#22577A',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px'
                  }}
                  onClick={handleExportPDF}
                  disabled={exportLoading}
                >
                  <i className="bi bi-file-earmark-pdf me-1"></i>
                  Export PDF
                </button>
              </div>
            </div>

            {loading && (
              <div className="text-center py-4">
                <span className="spinner-border text-primary" role="status"></span>
              </div>
            )}

            {error && (
              <div className="alert alert-danger text-center">{error}</div>
            )}

            {!loading && !error && (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ maxHeight: 500, overflowY: 'auto', borderRadius: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ 
                        color: '#888', 
                        fontWeight: 600, 
                        fontSize: 15, 
                        textAlign: 'left',
                        position: 'sticky',
                        top: 0,
                        background: '#fff',
                        zIndex: 1
                      }}>
                        <th style={{ padding: '16px 8px' }}>Visitor ID</th>
                        <th style={{ padding: '16px 8px' }}>Visitor Name</th>
                        <th style={{ padding: '16px 8px' }}>Professor</th>
                        <th style={{ padding: '16px 8px' }}>Purpose</th>
                        <th style={{ padding: '16px 8px' }}>Date/Time</th>
                        <th style={{ padding: '16px 8px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVisits.map((visit) => (
                        <tr key={visit.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '14px 8px', color: '#bdbdbd', fontWeight: 500 }}>
                            {visit.visitorsID}
                          </td>
                          <td style={{ padding: '14px 8px', color: '#222', fontWeight: 600 }}>
                            {formatFullName(visitors[visit.visitorsID]) || visit.visitorsID}
                          </td>
                          <td style={{ padding: '14px 8px', color: '#666' }}>
                            {formatFullName(professors[String(visit.prof_id)]) || visit.prof_id || '-'}
                          </td>
                          <td style={{ padding: '14px 8px', color: '#666' }}>
                            {visit.purpose || '-'}
                          </td>
                          <td style={{ padding: '14px 8px', color: '#bdbdbd' }}>
                            {visit.createdAt ? toManilaDateTime(visit.createdAt) : '-'}
                          </td>
                          <td style={{ padding: '14px 8px' }}>
                            {visit.qr_tagged ? (
                              <span className="badge bg-success">Tagged</span>
                            ) : (
                              <span className="badge bg-secondary">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredVisits.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#888', padding: '24px 0' }}>
                      No visits found for this period.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;