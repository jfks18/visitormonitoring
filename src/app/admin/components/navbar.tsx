"use client";
import React from "react";
import { useRouter } from "next/navigation";

const Navbar = () => {
  const router = useRouter();

  const handleLogout = async () => {
    const authStr = localStorage.getItem("adminAuth");
    let username = "";
    if (authStr) {
      try {
        const auth = JSON.parse(authStr);
        username = auth.username;
      } catch {}
    }
    if (username) {
  await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
    }
    localStorage.removeItem("adminAuth");
    router.replace("/admin/login");
  };

  return (
    <nav style={{ background: '#eaf9fc', boxShadow: '0 1px 6px #0001' }}>
      <div className="container-fluid" style={{ display: 'flex', alignItems: 'center', padding: '12px 24px' }}>
        <a className="navbar-brand d-flex align-items-center gap-2" href="#" style={{ color: '#22577A' }}>
          <i className="bi bi-shield-lock-fill fs-4"></i>
          <span className="fw-bold">Admin Panel</span>
        </a>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#22577A', fontSize: 14, display: 'none' }} className="d-none d-md-inline">Logged in as <b>admin</b></span>
          <button
            className="btn d-flex align-items-center gap-1"
            onClick={handleLogout}
            style={{ background: '#22577A', color: '#fff', borderRadius: 8, padding: '6px 10px' }}
          >
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;