'use client'
import React from 'react'
import { toManilaDateTime } from '../../../lib/manila';
import { useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

// PrintLayout for a thermal receipt printer
// Props: expects children or receipt data as props
const PrintLayout = () => {
  const searchParams = useSearchParams()
  const visitorID = searchParams.get('visitorID')
  const [visitor, setVisitor] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [visits, setVisits] = React.useState<any[] | null>(null)

  React.useEffect(() => {
    if (!visitorID) {
      setError('No visitor ID provided.')
      setLoading(false)
      return
    }
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'
  fetch(`${apiBase}/api/visitorsdata/${encodeURIComponent(visitorID)}`, {
      headers: {
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text()
          let msg = 'Failed to fetch visitor data.'
          try {
            const err = JSON.parse(text)
            msg = err.message || msg
          } catch {}
          throw new Error(msg)
        }
        return res.json()
      })
      .then(data => {
        if (data && data.visitorsID) {
          setVisitor(data)
          setError('')
          // Now fetch office_visits, offices and professors in parallel
          Promise.all([
            fetch(`${apiBase}/api/office_visits?visitorsID=${encodeURIComponent(visitorID)}`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } }).then(async r => {
              if (!r.ok) return [];
              const t = await r.text(); try { return JSON.parse(t); } catch { return [] }
            }).catch(() => []),
            fetch(`${apiBase}/api/offices`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } }).then(async r => { const t = await r.text(); try { return JSON.parse(t); } catch { return [] } }).catch(() => []),
            fetch(`${apiBase}/api/professors`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } }).then(async r => { const t = await r.text(); try { return JSON.parse(t); } catch { return [] } }).catch(() => []),
          ]).then(([visRows, officeRows, profRows]) => {
            // Map offices and professors for display
            const officeMap: Record<number, any> = {};
            if (Array.isArray(officeRows)) officeRows.forEach((o: any) => { officeMap[o.id] = o; });
            const profMap: Record<number, any> = {};
            if (Array.isArray(profRows)) profRows.forEach((p: any) => { profMap[p.id] = p; });

            if (Array.isArray(visRows) && visRows.length > 0) {
              const mapped = visRows.map((v: any) => ({
                dept_id: v.dept_id,
                office: officeMap[v.dept_id] ? (officeMap[v.dept_id].department || officeMap[v.dept_id].name) : String(v.dept_id),
                prof_id: v.prof_id,
                professor: profMap[v.prof_id] ? `${profMap[v.prof_id].first_name} ${profMap[v.prof_id].middle_name ?? ''} ${profMap[v.prof_id].last_name}`.replace(/  +/g,' ').trim() : (v.professor_name || ''),
                purpose: v.purpose || '',
              }));
              setVisits(mapped);
            } else {
              setVisits([]);
            }
          }).catch(() => {
            // If any fetch fails, leave visits null and fallback to visitor.faculty_to_visit
            setVisits(null);
          }).finally(() => setLoading(false));
        } else {
          setError('Visitor not found.')
          setLoading(false)
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch visitor data.')
        setLoading(false)
      })
  }, [visitorID])

  // Trigger print when visitor data is loaded and no error
  React.useEffect(() => {
    if (visitor && !loading && !error) {
      setTimeout(() => {
        window.print()
      }, 300) // slight delay to ensure render
    }
  }, [visitor, loading, error])

  if (loading) return <div>Loading...</div>
  if (error) return <div style={{ color: 'red' }}>{error}</div>
  if (!visitor) return null

  return (
    <div
      style={{
        width: '136px', // 48mm ≈ 136px at 72dpi (web/print safe), or 181px at 96dpi, but 136px is safe for most 48mm printers
        maxWidth: '100%',
        height: '210mm',
        margin: '0 auto',
        fontFamily: 'monospace',
        fontSize: '12px',
        background: '#fff',
        color: '#000',
        padding: '8px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <strong style={{ fontSize: '14px' }}>Visitor Pass</strong>
        <div style={{ fontSize: '10px' }}>Thank you for visiting!</div>
      </div>
      <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '8px 0' }} />
      {/* QR Code */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <QRCodeSVG value={visitor.visitorsID} size={70} />
      </div>
      {/* Content */}
      <div>
        <div>
          Visitor ID: <strong>{visitor.visitorsID}</strong>
        </div>
        <div>
          Name: {visitor.first_name} {visitor.middle_name} {visitor.last_name}
        </div>
        <div>Gender: {visitor.gender}</div>
        {/* Removed Age and Purpose fields as requested */}
          <div style={{ marginTop: '8px', marginBottom: '8px' }}>
          <div><strong>Offices to Visit</strong></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visits && visits.length > 0 ? (
              visits.map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '10px', marginBottom: '2px' }}>{item.office}</span>
                  {item.professor ? (
                    <span style={{ fontSize: '10px', marginBottom: '2px', fontWeight: 600 }}>{item.professor}</span>
                  ) : (
                    <span style={{ borderBottom: '1px solid #000', width: '100%', minWidth: 60, height: 12, display: 'block' }}>&nbsp;</span>
                  )}
                  {item.purpose ? <span style={{ fontSize: '10px', color: '#333' }}>Purpose: {item.purpose}</span> : null}
                </div>
              ))
            ) : (
              // fallback to old visitor.faculty_to_visit format
              (Array.isArray(visitor.faculty_to_visit) ? visitor.faculty_to_visit : typeof visitor.faculty_to_visit === 'string' ? JSON.parse(visitor.faculty_to_visit) : []).map((item: any, idx: number) => {
                if (typeof item === 'object' && item !== null && 'office' in item) {
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '10px', marginBottom: '2px' }}>{item.office}</span>
                      {item.professor ? (
                        <span style={{ fontSize: '10px', marginBottom: '2px', fontWeight: 600 }}>{item.professor}</span>
                      ) : (
                        <span style={{ borderBottom: '1px solid #000', width: '100%', minWidth: 60, height: 12, display: 'block' }}>&nbsp;</span>
                      )}
                      {item.purpose ? <span style={{ fontSize: '10px', color: '#333' }}>Purpose: {item.purpose}</span> : null}
                    </div>
                  );
                } else {
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '10px', marginBottom: '2px' }}>{item}</span>
                      <span style={{ borderBottom: '1px solid #000', width: '100%', minWidth: 60, height: 12, display: 'block' }}>&nbsp;</span>
                    </div>
                  );
                }
              })
            )}
          </div>
        </div>
  <div>Date: {toManilaDateTime(new Date())}</div>
      </div>
      <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '8px 0' }} />
      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '8px' }}>
        Powered by VisitorMonitoring
      </div>
    </div>
  )
}

export default PrintLayout