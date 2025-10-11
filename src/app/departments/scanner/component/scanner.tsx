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
