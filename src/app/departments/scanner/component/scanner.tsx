"use client";
import React, { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const DepartmentScanner = () => {
  const [scannerResult, setScannerResult] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Try to get dept_id from localStorage.adminAuth
  const getDeptId = () => {
    try {
      const raw = localStorage.getItem("adminAuth");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.dept_id ?? null;
    } catch (err) {
      return null;
    }
  };

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
        const payload: any = { visitorsID: trimmedResult };
        if (deptId) payload.dept_id = deptId;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/visitorslog/scan`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json();
        if (!response.ok) {
          setScannerResult(null);
          setErrorMessage(data.message || "Scan failed");
        } else {
          setMessage(data.message || "Scan success");
          setErrorMessage(null);

          // Additional: check visitor data and appointments for this department, then mark qr_tagged = 1
          try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';

            // 1) Ensure visitor exists (optional but helpful)
            const vresp = await fetch(`${apiBase}/api/visitorsdata/${encodeURIComponent(trimmedResult)}`);
            if (!vresp.ok) {
              // visitor record not found — still proceed to mark if there's an office_visit
              console.warn('visitorsdata not found for', trimmedResult);
            }

            // 2) Fetch office_visits for this visitor (try query param; fallback to fetching all and filtering)
            let visits: any[] = [];
            try {
              const ovRes = await fetch(`${apiBase}/api/office_visits?visitorsID=${encodeURIComponent(trimmedResult)}`);
              if (ovRes.ok) visits = await ovRes.json().catch(() => []);
              else {
                // fallback: get all and filter
                const allRes = await fetch(`${apiBase}/api/office_visits`);
                const all = allRes.ok ? await allRes.json().catch(() => []) : [];
                visits = Array.isArray(all) ? all.filter((r: any) => String(r.visitorsID) === String(trimmedResult)) : [];
              }
            } catch (err) {
              console.warn('Failed to fetch office_visits:', err);
            }

            // 3) Find a visit matching this dept (prefer untagged)
            let matched = null;
            if (visits && visits.length) {
              matched = visits.find((v: any) => deptId && String(v.dept_id) === String(deptId) && !(v.qr_tagged === 1 || v.qr_tagged === true));
              if (!matched) matched = visits.find((v: any) => deptId ? String(v.dept_id) === String(deptId) : true);
            }

            if (matched) {
              // Call PUT to update latest office_visit for this visitor — include dept and set qr_tagged
              const putRes = await fetch(`${apiBase}/api/office_visits/by-visitors/${encodeURIComponent(trimmedResult)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dept_id: deptId ?? matched.dept_id, qr_tagged: 1 }),
              });

              if (!putRes.ok) {
                const t = await putRes.text().catch(() => '');
                console.warn('Failed to mark qr_tagged:', t);
              } else {
                console.info('Marked qr_tagged for visitor', trimmedResult);
              }
            } else {
              console.info('No matching office_visit found for visitor', trimmedResult, 'dept', deptId);
            }
          } catch (err) {
            console.error('Error during post-scan visit check:', err);
          }
        }
      } catch (err) {
        setScannerResult(null);
        setErrorMessage("Failed to process scan.");
        console.error("Failed to process scan:", err);
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
    <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ background: '#e3f6fd' }}>
      <div className="card shadow-lg p-4" style={{ maxWidth: 500, width: '100%' }}>
        <div className="card-header bg-primary text-white text-center fs-5 fw-bold rounded-top">
          <i className="bi bi-upc-scan me-2"></i>Department QR Scanner
        </div>
        <div className="card-body">
          {showScanner ? (
            <div id="reader-dept" className="mb-3" />
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

export default DepartmentScanner;
