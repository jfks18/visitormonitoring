'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import useSWR from 'swr';

const RegistrationCard = () => {
  const router = useRouter();
  const [selectedOffices, setSelectedOffices] = useState<string[]>([]);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Male');
  const [birthDate, setBirthDate] = useState('');
  const [selectedPurposes, setSelectedPurposes] = useState<{ [office: string]: string }>({});
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedProfessors, setSelectedProfessors] = useState<{ [office: string]: string }>({});
  const [offices, setOffices] = useState<{ id: number; name: string }[]>([]);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev';

  // Availability state for selected offices
  const [officeAvailability, setOfficeAvailability] = useState<{ [officeId: string]: { available: boolean; message?: string } }>({});
  const [proceedIfUnavailable, setProceedIfUnavailable] = useState(false);

  const fetcher = (url: string) =>
    fetch(url, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } })
      .then(async res => {
        const text = await res.text();
        if (!res.ok) throw new Error('Failed to fetch: ' + text);
        if (text.trim().startsWith('<!DOCTYPE html>')) throw new Error('Received HTML instead of JSON.');
        try {
          return JSON.parse(text);
        } catch {
          throw new Error('Response is not valid JSON: ' + text);
        }
      });

  const { data: officeRows, error: officeError, isLoading: officeLoading, mutate: refreshOffices } = useSWR(
  `${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/offices`,
    fetcher,
    { refreshInterval: 5000 }
  );

  useEffect(() => {
    if (officeRows && Array.isArray(officeRows)) {
      setOffices(officeRows.map((row: any) => ({ id: row.id, name: row.department || row.name || '' })));
    }
  }, [officeRows]);

  // Check availability for selected offices (best-effort; backend endpoints may not exist)
  const checkOfficeAvailability = async (officeIds: string[]) => {
    const map: { [officeId: string]: { available: boolean; message?: string } } = {};
    await Promise.all(officeIds.map(async (id) => {
      try {
        // Assumption: backend exposes a status endpoint like /api/offices/{id}/status
        const res = await fetch(`${apiBase}/api/offices/${encodeURIComponent(id)}/status`, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) {
          // If endpoint missing or error, mark as unknown/available-by-default
          map[id] = { available: true };
          return;
        }
        const data = await res.json();
        // Expecting { available: boolean, message?: string }
        map[id] = { available: !!data.available, message: data.message };
      } catch (err) {
        // Network or parsing error - treat as available (fail open) but record no message
        map[id] = { available: true };
      }
    }));
    setOfficeAvailability(prev => ({ ...prev, ...map }));
  };

  useEffect(() => {
    if (selectedOffices.length > 0) {
      // Reset override when selection changes
      setProceedIfUnavailable(false);
      checkOfficeAvailability(selectedOffices);
    }
  }, [selectedOffices]);

  // Child component for professor select per office
  const ProfessorSelect: React.FC<{
    officeId: string;
    value: string;
    onChange: (profId: string) => void;
  }> = ({ officeId, value, onChange }) => {
    const profFetcher = (url: string) =>
      fetch(url, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } })
        .then(async res => {
          const text = await res.text();
          if (!res.ok) throw new Error('Failed to fetch: ' + text);
          if (text.trim().startsWith('<!DOCTYPE html>')) throw new Error('Received HTML instead of JSON.');
          try {
            return JSON.parse(text);
          } catch {
            throw new Error('Response is not valid JSON: ' + text);
          }
        });
    const { data } = useSWR(
  `${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/professors/department/${officeId}`,
      profFetcher,
      { refreshInterval: 5000 }
    );
    const professors = Array.isArray(data)
      ? data.map((prof: any) => ({ id: prof.id, name: `${prof.first_name} ${prof.middle_name} ${prof.last_name}` }))
      : [];
    return (
      <select
        className="form-select"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        required
      >
        <option value="">Select Professor</option>
        {professors.map(prof => (
          <option key={prof.id} value={prof.name}>{prof.name}</option>
        ))}
      </select>
    );
  };

  const handleOfficeChange = (office: string) => {
    setSelectedOffices(prev =>
      prev.includes(office)
        ? prev.filter(o => o !== office)
        : [...prev, office]
    );
  };

  const generateVisitorId = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePart = `${yyyy}${mm}${dd}`;
    const randomPart = Math.floor(10000000 + Math.random() * 90000000); // 8 digits
    return `${datePart}${randomPart}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    const visitorsID = generateVisitorId();

    try {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/visitorsdata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          visitorsID,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          address,
          phone,
          suffix: '', // or add a suffix field if you want
          gender,
          birth_date: birthDate,
          faculty_to_visit: selectedOffices.map(officeId => {
            const officeObj = offices.find(o => String(o.id) === officeId);
            const officeName = officeObj ? officeObj.name : officeId;
            const profId = selectedProfessors[officeId];
             return {
               office: officeName,
               professor: profId || null,
               purpose: selectedPurposes[officeId] || null
             };
          }),
        }),
      });
      if (!res.ok) throw new Error('Failed to register');
      // Also insert into /api/visitorlog
  await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://gleesome-feracious-noelia.ngrok-free.dev'}/api/visitorslog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorsID }),
      });
      // Optionally, get the created visitor data from the response
      const data = await res.json();
      setSuccess(true);
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setGender('Male');
      setBirthDate('');
  setSelectedOffices([]);
       setSelectedPurposes({});
      // Redirect to print layout with visitorID as query param
      router.push(`/registration/print?page=receipt&visitorID=${visitorsID}`);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Validation for each step
  const isStep1Valid = firstName.trim() && lastName.trim() && phone.trim();
  const isStep2Valid = selectedOffices.length > 0;
  const isStep3Valid = selectedOffices.every(office => selectedProfessors[office] && (selectedPurposes[office] && selectedPurposes[office].trim() !== ''));

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow-lg p-4" style={{ maxWidth: 500, width: '100%', background: '#FFFFDF' }}>
        {/* Removed Progress Bar */}
        <div className="card-header text-center fs-5 fw-bold rounded-top"
          style={{ background: '#C8EDF7', color: '#111', fontWeight: 700, fontSize: 32, marginTop: 0 }}>
          Visitor Registration
        </div>
        <form onSubmit={handleSubmit} className="mt-3">
          {success && <div className="alert alert-success d-flex align-items-center" role="alert"><i className="bi bi-check-circle-fill me-2"></i>Registration successful!</div>}
          {error && <div className="alert alert-danger d-flex align-items-center" role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <>
              <div className="mb-3">
                <label className="form-label fw-semibold">First Name</label>
                <input type="text" className="form-control" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Middle Name</label>
                <input type="text" className="form-control" value={middleName} onChange={e => setMiddleName(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Last Name</label>
                <input type="text" className="form-control" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Address</label>
                <input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Phone Number</label>
                <input type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Gender</label>
                <select className="form-select" value={gender} onChange={e => setGender(e.target.value)} required>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="d-flex justify-content-end mt-4">
                <button type="button" className="btn px-4" onClick={() => setStep(2)}
                  style={{ background: '#C8EDF7', color: '#222', fontWeight: 600, border: 'none' }}>
                  Next
                </button>
              </div>
            </>
          )}

          {/* Step 2: Date and Offices */}
          {step === 2 && (
            <>
              <div className="mb-3">
                <label className="form-label fw-semibold">Date of Visit</label>
                <input
                  type="text"
                  className="form-control"
                  value={
                    (() => {
                      const today = new Date();
                      const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
                      return today.toLocaleDateString(undefined, options);
                    })()
                  }
                  readOnly
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold d-flex align-items-center" style={{ gap: 8 }}>
                  Offices to Visit
                  <button type="button" className="btn btn-sm btn-outline-secondary" style={{ padding: '2px 8px', fontSize: 14 }} onClick={() => refreshOffices()} title="Refresh offices">
                    <i className="bi bi-arrow-clockwise"></i> Refresh
                  </button>
                </label>
                <Select
                  isMulti
                  options={offices.map(office => ({ value: String(office.id), label: office.name }))}
                  value={offices.filter(o => selectedOffices.includes(String(o.id))).map(o => ({ value: String(o.id), label: o.name }))}
                  onChange={opts => setSelectedOffices(Array.isArray(opts) ? opts.map((opt: any) => opt.value) : [])}
                  classNamePrefix="react-select"
                  placeholder="Select offices..."
                />
              </div>
              
              <div className="d-flex justify-content-between mt-4">
                <button type="button" className="btn btn-secondary px-4" onClick={() => setStep(1)}>
                  Previous
                </button>
                <button type="button" className="btn px-4" onClick={() => setStep(3)} disabled={selectedOffices.length === 0}
                  style={{ background: '#C8EDF7', color: '#222', fontWeight: 600, border: 'none' }}>
                  Next
                </button>
              </div>
            </>
          )}

          {/* Step 3: Offices and Professors */}
          {step === 3 && (
            <>
              <div className="mb-3">
                <label className="form-label fw-semibold">Selected Offices and Professors</label>
                {selectedOffices.length === 0 && <div className="text-muted">No office selected.</div>}
                    {selectedOffices.map((officeId) => {
                  const office = offices.find(o => String(o.id) === officeId);
                  return (
                    <div key={officeId} className="mb-3 p-2 border rounded bg-light">
                      <div className="fw-semibold mb-1">{office ? office.name : officeId}</div>
                      <ProfessorSelect
                        officeId={officeId}
                        value={selectedProfessors[officeId] || ''}
                        onChange={profId => setSelectedProfessors(prev => ({ ...prev, [officeId]: profId }))}
                      />
                          <div className="mt-2">
                            <label className="form-label fw-semibold">Purpose for this office</label>
                            <input type="text" className="form-control" value={selectedPurposes[officeId] || ''} onChange={e => setSelectedPurposes(prev => ({ ...prev, [officeId]: e.target.value }))} required />
                          </div>
                    </div>
                  );
                })}
              </div>
              <div className="d-flex justify-content-between mt-4">
                <button type="button" className="btn btn-secondary px-4" onClick={() => setStep(2)}>
                  Previous
                </button>
                <button type="submit" className="btn px-4" disabled={loading}
                  style={{ background: '#C8EDF7', color: '#222', fontWeight: 600, border: 'none' }}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> : null}
                  Register
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

export default RegistrationCard