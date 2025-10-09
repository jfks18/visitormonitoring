"use client";
import React, { useEffect, useState } from 'react';

interface Department {
  id: number;
  name: string;
  // add other fields if your API returns them
}

const Table = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch('/api/departments', {
      headers: { Accept: 'application/json' }
    })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) throw new Error('Failed to fetch: ' + text);
        // protect against HTML error pages
        if (text.trim().startsWith('<!DOCTYPE html>')) {
          throw new Error('Received HTML instead of JSON — backend may be down or URL incorrect');
        }
        try {
          return JSON.parse(text) as Department[];
        } catch (e) {
          throw new Error('Invalid JSON response: ' + text);
        }
      })
      .then((data) => {
        if (isMounted) setDepartments(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Departments fetch error:', err);
        if (isMounted) setError(String(err.message || err));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = departments.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    // if search or data changes, reset to first page
    setCurrentPage(1);
  }, [search]);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Departments</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="search"
            placeholder="Search departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-control"
            style={{ maxWidth: 240 }}
          />
        </div>
      </div>

      {loading && <div className="text-center py-3">Loading departments...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table table-hover">
            <thead>
              <tr>
                <th style={{ width: 80 }}>ID</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.name}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-center text-muted">No departments found.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="text-muted">Showing {filtered.length} result{filtered.length !== 1 ? 's' : ''}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                Prev
              </button>
              <div>Page {currentPage} / {totalPages}</div>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;