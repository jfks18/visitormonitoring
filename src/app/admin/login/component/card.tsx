'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const LoginCard = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(username, password);
      // If login is successful and token is set, redirect to dashboard
      if (data.user && data.user.adminToken) {
        router.replace('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const login = async (username: string, password: string) => {
    try {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://apivisitor.onrender.com'}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }
      // Store both adminToken and username as a JSON object in localStorage
      if (data.user && data.user.adminToken) {
        localStorage.setItem('adminAuth', JSON.stringify({
          adminToken: data.user.adminToken,
          username: data.user.username
        }));
      }
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Login failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFDD0' }}>
      <div className="container-fluid">
        <div className="row pt-4 ps-4 align-items-center">
          <div className="col-auto">
            <Image src="/backgrounds/passlogo.png" alt="GrandPass Logo" width={48} height={48} />
          </div>
          <div className="col-auto">
            <span style={{ fontWeight: 700, fontSize: 28, color: '#22577A', letterSpacing: 1 }}>GrandPass</span>
          </div>
        </div>
      </div>
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
        <h2 className="fw-bold mt-4" style={{ color: '#222', textAlign: 'center' }}>Sign in as an Admin!</h2>
        <div className="mb-2" style={{ color: '#bdbdbd', textAlign: 'center', fontWeight: 500 }}>
          Enter your <span style={{ color: '#22577A' }}>username</span> and <span style={{ color: '#22577A' }}>password</span>
        </div>
          <div className="card shadow-lg p-4 mt-2 position-relative" style={{ borderRadius: 18, maxWidth: 320, width: '100%', background: '#fff', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <form onSubmit={handleSubmit} style={{ flex: 1, marginBottom: 20 }}>
            <div className="mb-3">
              <div className="input-group">
                <span className="input-group-text bg-light border-0"><i className="bi bi-person" style={{ color: '#22577A' }}></i></span>
                <input
                  type="text"
                  className="form-control border-0 bg-light"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  style={{ fontWeight: 500 }}
                />
              </div>
            </div>
            <div className="mb-3">
              <div className="input-group">
                <span className="input-group-text bg-light border-0"><i className="bi bi-lock" style={{ color: '#22577A' }}></i></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control border-0 bg-light"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ fontWeight: 500 }}
                />
                <button
                  type="button"
                  className="btn btn-link px-2"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ color: '#22577A' }}
                >
                  <Image
                    src={showPassword ? '/icons/eyeopen.png' : '/icons/eyeclose.png'}
                    alt={showPassword ? 'Hide password' : 'Show password'}
                    width={22}
                    height={22}
                  />
                </button>
              </div>
            </div>
            <div className="mb-3 d-flex align-items-center">
              <input type="checkbox" className="form-check-input me-2" id="rememberMe" />
              <label htmlFor="rememberMe" className="form-check-label" style={{ fontSize: 14 }}>Remeber my password</label>
            </div>
            {error && <div className="alert alert-danger d-flex align-items-center py-2" role="alert" style={{ fontSize: 14 }}><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}
            <button type="submit" className="btn w-100 fw-bold py-2" style={{ background: '#1877F2', color: '#fff', fontSize: 17, borderRadius: 7, boxShadow: '0 2px 8px #1877f233' }}>Login</button>
          </form>
          <div style={{ position: 'absolute', right: 10, bottom: 6, fontWeight: 700, color: '#222', opacity: 0.5, fontSize: 13, letterSpacing: 1, zIndex: 2, lineHeight: 1 }}>ADMIN</div>
        </div>
      </div>
    </div>
  );
};

export default LoginCard;