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
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';
        // Call the new scan endpoint which will validate dept and tag the latest visit
        const resp = await fetch(`${apiBase}/api/office_visits/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorsID: trimmedResult, dept_id: deptId }),
        });

        let data: any = {};
        let textBody = '';
        try {
          textBody = await resp.text();
          try { data = JSON.parse(textBody); } catch (e) { data = { message: textBody }; }
        } catch (e) {
          data = {};
        }

        if (!resp.ok) {
          // surface backend status and message in the UI for debugging
          const backendMessage = data?.message || textBody || `HTTP ${resp.status}`;
          setMessage(null);
          setErrorMessage(`${backendMessage} (status ${resp.status})`);
          clearScannerLock();
        } else {
          setMessage(data.message || 'Visitor verified and QR tagged for department');
          setErrorMessage(null);
          setDebugVisits(null);
          clearScannerLock();
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
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow-lg p-4" style={{ maxWidth: 500, width: '100%' }}>
        <div className="card-header bg-primary text-white text-center fs-5 fw-bold rounded-top">
          <i className="bi bi-upc-scan me-2"></i>QR Code Scanner
        </div>
        <div className="card-body">
          {showScanner ? (
            <div id="reader-dept" className="mb-3" />
          ) : (
            <div className="text-center my-4">
              {message && <div className="alert alert-success d-flex align-items-center justify-content-center"><i className="bi bi-check-circle-fill me-2"></i>{message}</div>}
              {errorMessage && <div className="alert alert-danger d-flex align-items-center justify-content-center"><i className="bi bi-x-circle-fill me-2"></i>{errorMessage}</div>}
              <button className="btn btn-outline-primary mt-3" onClick={() => { setShowScanner(true); setMessage(null); setErrorMessage(null); }}>
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
