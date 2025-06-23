import React from 'react'

const Navbar = () => {
  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary">
      <div className="container-fluid d-flex align-items-center">
        <a className="navbar-brand d-flex align-items-center gap-2" href="#" style={{ fontWeight: 700, fontSize: 32, color: '#2d5fff' }}>
          <img
            src="/backgrounds/passlogo.png"
            alt="GrandPass Logo"
            style={{ width: 48, height: 48, marginRight: 12 }}
          />
          <span style={{ fontWeight: 700, fontSize: 32, color: '#2d5fff', fontFamily: 'inherit' }}>GrandPass</span>
        </a>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
        </div>
      </div>
    </nav>
  )
}

export default Navbar