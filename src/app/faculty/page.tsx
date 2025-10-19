"use client";
import React from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Link from 'next/link';

const FacultyHome = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#e3f6fd' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 220, minHeight: '100vh' }}>
        <TopBar />
        <div style={{ padding: 32 }}>
          <div className="card shadow-sm" style={{ borderRadius: 18 }}>
            <div className="card-body p-4">
              <h5 className="fw-bold" style={{ color: '#222' }}>Welcome to the Faculty Portal</h5>
              <p className="text-muted">Use the navigation to view your visitors log or manage your profile.</p>
              <Link className="btn btn-primary" href="/faculty/visitors">Go to Visitors Log</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyHome;