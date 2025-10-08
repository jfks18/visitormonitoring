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
      await fetch("https://gleesome-feracious-noelia.ngrok-free.dev/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
    }
    localStorage.removeItem("adminAuth");
    router.replace("/admin/login");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
      <div className="container-fluid">
        <a className="navbar-brand d-flex align-items-center gap-2" href="#">
          <i className="bi bi-shield-lock-fill fs-4"></i>
          <span className="fw-bold">Admin Panel</span>
        </a>
        <div className="d-flex align-items-center gap-3 ms-auto">
          <span className="text-white small d-none d-md-inline">
            Logged in as <b>admin</b>
          </span>
          <button
            className="btn btn-danger d-flex align-items-center gap-1"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;