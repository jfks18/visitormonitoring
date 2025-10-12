"use client";
import React, { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const DepartmentScanner = () => {
  const [scannerResult, setScannerResult] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugVisits, setDebugVisits] = useState<any[] | null>(null);

  // Try to get dept_id from localStorage.adminAuth
  const getDeptId = () => {
    try {
      const raw = localStorage.getItem("adminAuth");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // tolerate multiple possible keys (dept_id, department, deptId, department_id)
      return parsed?.dept_id ?? parsed?.department ?? parsed?.deptId ?? parsed?.department_id ?? null;
    } catch (err) {
      return null;
    }
  };

  // scanner lock helpers (prevent multiple active scanners)
  const SCANNER_LOCK_KEY = 'scannerActiveLock_v1';
  const LOCK_TTL_MS = 60 * 1000; // 60 seconds freshness window
  const getScannerLock = () => {
    try {
      const raw = localStorage.getItem(SCANNER_LOCK_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (e) { return null; }
  };
  const setScannerLock = () => {
    try { localStorage.setItem(SCANNER_LOCK_KEY, JSON.stringify({ active: true, ts: Date.now() })); } catch (e) {}
  };
  const clearScannerLock = () => { try { localStorage.removeItem(SCANNER_LOCK_KEY); } catch (e) {} };

  useEffect(() => {
    if (!showScanner && (message || errorMessage)) {
      const timer = setTimeout(() => {
        setShowScanner(true);
        setMessage(null);
        setErrorMessage(null);
      }, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [showScanner, message, errorMessage]);

  useEffect(() => {
    if (!showScanner) return;
    // Prevent multiple scanners: check lock
    const existingLock = getScannerLock();
    if (existingLock && (Date.now() - (existingLock.ts || 0) < LOCK_TTL_MS)) {
      // another scanner likely active — do not render
      setErrorMessage('Another scanner is active. Please try again in a moment.');
      setShowScanner(false);
      return;
    }
    setScannerLock();

    const scanner = new Html5QrcodeScanner(
      "reader-dept",
      {
        qrbox: { width: 250, height: 250 },
        fps: 5,
      },
      /* verbose= */ false
    );

    async function success(result: string) {
      const trimmedResult = result.trim();
      scanner.clear();
      setScannerResult(result);
      setShowScanner(false);
      try {
  const deptId = getDeptId();
        // Instead of updating visitorslog, directly mark the visitor's office_visit(s) as tagged for this department
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';

          // 1) Fetch office_visits for this visitor (prefer visitorsID query, fallback to all and filter)
          let visits: any[] = [];
          try {
            const ovRes = await fetch(`${apiBase}/api/office_visits?visitorsID=${encodeURIComponent(trimmedResult)}`);
            if (ovRes.ok) visits = await ovRes.json().catch(() => []);
            else {
              const allRes = await fetch(`${apiBase}/api/office_visits`);
              const all = allRes.ok ? await allRes.json().catch(() => []) : [];
              visits = Array.isArray(all) ? all.filter((r: any) => String(r.visitorsID) === String(trimmedResult)) : [];
            }
          } catch (err) {
            console.warn('Failed to fetch office_visits:', err);
          }

          // 2) Find visits matching this dept (prefer untagged)
          let matchedVisits: any[] = [];
          if (visits && visits.length) {
            // debug: log visits shape and deptId to help diagnose mismatches
            console.debug('DepartmentScanner fetched visits', { visits, deptId });

            // prepare a lightweight debug view for the UI
            try {
              const visitsDebug = visits.map((v: any) => ({
                id: v.id ?? null,
                visitorsID: v.visitorsID ?? v.visitorsId ?? null,
                visitDept: v.dept_id ?? v.deptId ?? v.department_id ?? v.department ?? v.dept ?? null,
                qr_tagged: v.qr_tagged ?? null,
                createdAt: v.createdAt ?? null,
              }));
              setDebugVisits(visitsDebug);
            } catch (e) {
              setDebugVisits(null);
            }

            if (deptId) {
              matchedVisits = visits.filter((v: any) => {
                const visitDept = v.dept_id ?? v.deptId ?? v.department_id ?? v.department ?? v.dept ?? null;
                return visitDept !== null && String(visitDept) === String(deptId);
              });
                // prefer untagged first
                matchedVisits = matchedVisits.sort((a: any, b: any) => ((a.qr_tagged ? 1 : 0) - (b.qr_tagged ? 1 : 0)));
            } else {
              matchedVisits = visits;
            }
          }

            if (matchedVisits.length) {
            // Update each matched visit's qr_tagged = 1. Prefer updating by visitorsID endpoint if server supports dept filter.
            // We'll call the by-visitors PUT once with dept_id to update the latest for that dept (server-side behavior expected),
            // but also attempt per-id updates if available.
            // Try by-visitors PUT first (simple):
            const byVisitorsRes = await fetch(`${apiBase}/api/office_visits/by-visitors/${encodeURIComponent(trimmedResult)}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dept_id: deptId ?? matchedVisits[0].dept_id, qr_tagged: 1 }),
            });

            if (!byVisitorsRes.ok) {
              console.warn('by-visitors PUT failed, trying per-visit updates');
              // fallback: update per visit id
              for (const mv of matchedVisits) {
                try {
                  const resId = await fetch(`${apiBase}/api/office_visits/${encodeURIComponent(mv.id)}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qr_tagged: 1 }),
                  });
                  if (!resId.ok) {
                    const t = await resId.text().catch(() => '');
                    console.warn('Failed updating visit id', mv.id, t);
                  }
                } catch (err) {
                  console.warn('Error updating visit id', mv.id, err);
                }
              }
            } else {
              console.info('Marked qr_tagged via by-visitors endpoint for', trimmedResult);
            }

            setMessage('Visitor verified and QR tagged for department');
            setErrorMessage(null);
            setDebugVisits(null);
            // clear lock after successful scan
            clearScannerLock();
          } else {
            setMessage(null);
            setErrorMessage('No appointment found for this visitor in your department');
            console.info('No matching office_visit found for visitor', trimmedResult, 'dept', deptId);
            clearScannerLock();
          }
        } catch (err) {
          setMessage(null);
          setErrorMessage('Failed to mark visit as tagged');
          console.error('Error updating visit tag:', err);
        }
      } catch (err) {
        setScannerResult(null);
        setErrorMessage("Failed to process scan.");
        console.error("Failed to process scan:", err);
        clearScannerLock();
      }
    }

    function error(err: any) {
      console.warn(err);
    }

    scanner.render(success, error);

    // Cleanup on unmount: clear scanner and lock
    return () => {
      clearScannerLock();
      scanner.clear().catch(() => {});
    };
  }, [showScanner]);

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ background: '#e3f6fd' }}>
      <div className="card shadow-lg p-4" style={{ maxWidth: 500, width: '100%' }}>
        <div className="card-header bg-primary text-white text-center fs-5 fw-bold rounded-top">
          <i className="bi bi-upc-scan me-2"></i>Department QR Scanner
        </div>
        <div className="card-body">
          <div style={{ marginBottom: 8 }}>
            <strong>adminAuth (raw):</strong>
            <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 120, overflowY: 'auto', background: '#f7f7f7', padding: 8 }}>{localStorage.getItem('adminAuth') ?? 'not set'}</pre>
            <button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => { console.log('adminAuth:', localStorage.getItem('adminAuth')); }} style={{ padding: '2px 8px' }}>Show adminAuth (console)</button>
          </div>
          {showScanner ? (
            <div id="reader-dept" className="mb-3" />
          ) : (
            <div className="text-center my-4">
              {message && <div className="alert alert-success d-flex align-items-center justify-content-center"><i className="bi bi-check-circle-fill me-2"></i>{message}</div>}
              {errorMessage && <div className="alert alert-danger d-flex align-items-center justify-content-center"><i className="bi bi-x-circle-fill me-2"></i>{errorMessage}</div>}
              <button className="btn btn-outline-primary mt-3" onClick={() => setShowScanner(true)}>
                <i className="bi bi-arrow-clockwise me-1"></i>Scan Again
              </button>
              {debugVisits && errorMessage && (
                <div className="mt-3 text-start" style={{ maxHeight: 220, overflowY: 'auto' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Debug: fetched visits</div>
                  <table className="table table-sm">
                    <thead>
                      <tr><th>id</th><th>visitorsID</th><th>visitDept</th><th>qr_tagged</th><th>createdAt</th></tr>
                    </thead>
                    <tbody>
                      {debugVisits.map((v, i) => (
                        <tr key={i}><td>{v.id}</td><td>{v.visitorsID}</td><td>{v.visitDept}</td><td>{String(v.qr_tagged)}</td><td>{v.createdAt}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {scannerResult && showScanner && (
            <div className="alert alert-info mt-3 text-center">
              <i className="bi bi-qr-code me-2"></i>
              <strong>Result:</strong> {scannerResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentScanner;
