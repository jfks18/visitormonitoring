"use client";
import React, { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const Scanner = () => {
  const [scannerResult, setScannerResult] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    const scanner = new Html5QrcodeScanner(
      "reader",
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
      // Determine dept_id from adminAuth if available (same pattern used elsewhere)
      let deptId: string | null = null;
      try {
        const raw = localStorage.getItem('adminAuth');
        if (raw) {
          const parsed = JSON.parse(raw);
          deptId = parsed?.dept_id ?? null;
        }
      } catch (e) { /* ignore */ }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';

      // Fetch office_visits for this visitor
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

      // Find visits matching the dept (if deptId available), prefer untagged
      let matchedVisits: any[] = [];
      if (visits && visits.length) {
        if (deptId) {
          matchedVisits = visits.filter((v: any) => String(v.dept_id) === String(deptId));
          matchedVisits = matchedVisits.sort((a: any, b: any) => ((a.qr_tagged ? 1 : 0) - (b.qr_tagged ? 1 : 0)));
        } else {
          matchedVisits = visits;
        }
      }

      if (matchedVisits.length) {
        // Try the by-visitors PUT first
        const byVisitorsRes = await fetch(`${apiBase}/api/office_visits/by-visitors/${encodeURIComponent(trimmedResult)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dept_id: deptId ?? matchedVisits[0].dept_id, qr_tagged: 1 }),
        });

        if (!byVisitorsRes.ok) {
          // fallback: update each visit by id
          for (const mv of matchedVisits) {
            try {
              const resId = await fetch(`${apiBase}/api/office_visits/${encodeURIComponent(mv.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qr_tagged: 1 }) });
              if (!resId.ok) {
                const t = await resId.text().catch(() => '');
                console.warn('Failed updating visit id', mv.id, t);
              }
            } catch (err) { console.warn('Error updating visit id', mv.id, err); }
          }
        }

        setMessage('Visitor verified and QR tagged');
        setErrorMessage(null);
      } else {
        setMessage(null);
        setErrorMessage('No appointment found for this visitor');
      }
    } catch (err) {
      setScannerResult(null);
      setErrorMessage('Failed to process scan.');
      console.error('Failed to process scan:', err);
    }
  }
    function error(err: any) {
      console.warn(err);
    }

    scanner.render(success, error);

    // Cleanup on unmount
    return () => {
      scanner.clear().catch(() => {});
    };
  }, [showScanner]);

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow-lg p-4" style={{ maxWidth: 500, width: '100%' }}>
        <div className="card-header bg-primary text-white text-center fs-5 fw-bold rounded-top">
          <i className="bi bi-upc-scan me-2"></i>QR Code Scanner
        </div>
        <div className="card-body">
          {showScanner ? (
            <div id="reader" className="mb-3" />
          ) : (
            <div className="text-center my-4">
              {message && <div className="alert alert-success d-flex align-items-center justify-content-center"><i className="bi bi-check-circle-fill me-2"></i>{message}</div>}
              {errorMessage && <div className="alert alert-danger d-flex align-items-center justify-content-center"><i className="bi bi-x-circle-fill me-2"></i>{errorMessage}</div>}
              <button className="btn btn-outline-primary mt-3" onClick={() => setShowScanner(true)}>
                <i className="bi bi-arrow-clockwise me-1"></i>Scan Again
              </button>
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

export default Scanner;