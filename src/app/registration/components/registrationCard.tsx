'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation';

const RegistrationCard = () => {
  const router = useRouter();
  const [selectedOffices, setSelectedOffices] = useState<string[]>([]);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Male');
  const [birthDate, setBirthDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedProfessors, setSelectedProfessors] = useState<{ [office: string]: string }>({});
  const [offices, setOffices] = useState<{ id: number; name: string }[]>([]);
  const [professorsByOffice, setProfessorsByOffice] = useState<{ [officeId: number]: { id: number; name: string }[] }>({});

  // Fetch offices and professors on mount
  useEffect(() => {
    // Fetch offices
    fetch('https://buck-leading-pipefish.ngrok-free.app/api/offices', {
      headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    })
      .then(async res => {
        const text = await res.text();
        if (!res.ok) throw new Error('Failed to fetch: ' + text);
        if (text.trim().startsWith('<!DOCTYPE html>')) throw new Error('Received HTML instead of JSON. The backend may be down or the URL is incorrect.');
        try {
          return JSON.parse(text);
        } catch {
          throw new Error('Response is not valid JSON: ' + text);
        }
      })
      .then((rows) => {
        setOffices(Array.isArray(rows) ? rows.map((row: any) => ({ id: row.id, name: row.department || row.name || '' })) : []);
      })
      .catch(() => setOffices([]));
  }, []);

  // Fetch professors for selected offices only
  useEffect(() => {
    const fetchProfs = async () => {
      const grouped: { [officeId: number]: { id: number; name: string }[] } = {};
      await Promise.all(selectedOffices.map(async (officeId) => {
        try {
          const res = await fetch(`https://buck-leading-pipefish.ngrok-free.app/api/professors/department/${officeId}`, {
            headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          });
          const text = await res.text();
          if (!res.ok) throw new Error('Failed to fetch: ' + text);
          if (text.trim().startsWith('<!DOCTYPE html>')) throw new Error('Received HTML instead of JSON. The backend may be down or the URL is incorrect.');
          let rows;
          try {
            rows = JSON.parse(text);
          } catch {
            throw new Error('Response is not valid JSON: ' + text);
          }
          grouped[Number(officeId)] = Array.isArray(rows)
            ? rows.map((prof: any) => ({ id: prof.id, name: `${prof.first_name} ${prof.middle_name} ${prof.last_name}` }))
            : [];
        } catch {
          grouped[Number(officeId)] = [];
        }
      }));
      setProfessorsByOffice(grouped);
    };
    if (selectedOffices.length > 0) fetchProfs();
    else setProfessorsByOffice({});
  }, [selectedOffices]);

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
    console.log('Generated Visitor ID:', visitorsID);


    try {
      const res = await fetch('https://buck-leading-pipefish.ngrok-free.app/api/visitorsdata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorsID,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          email,
          phone,
          suffix: '', // or add a suffix field if you want
          gender,
          birth_date: birthDate,
          purpose_of_visit: purpose,
          faculty_to_visit: selectedOffices.map(officeId => {
            const officeObj = offices.find(o => String(o.id) === officeId);
            const officeName = officeObj ? officeObj.name : officeId;
            let professorName = null;
            const profId = selectedProfessors[officeId];
            if (profId && professorsByOffice[Number(officeId)]) {
              const profObj = professorsByOffice[Number(officeId)].find(p => String(p.id) === String(profId));
              professorName = profObj ? profObj.name : null;
            }
            return {
              office: officeName,
              professor: professorName
            };
          }),
        }),
      });
      if (!res.ok) throw new Error('Failed to register');
      // Also insert into /api/visitorlog
      await fetch('https://buck-leading-pipefish.ngrok-free.app/api/visitorslog', {
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
      setPurpose('');
      // Redirect to print layout with visitorID as query param
      router.push(`/registration/print?page=receipt&visitorID=${visitorsID}`);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Validation for each step
  const isStep1Valid = firstName.trim() && lastName.trim() && email.trim() && phone.trim();
  const isStep2Valid = selectedOffices.length > 0;
  const isStep3Valid = selectedOffices.every(office => selectedProfessors[office]);

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
                <label className="form-label fw-semibold">Email Address</label>
                <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Phone Number</label>
                <input type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} required />
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
                <label className="form-label fw-semibold">Offices to Visit</label>
                <div className="row g-2">
                  {offices.map((office, idx) => (
                    <div className="col-6" key={office.id}>
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id={`office-${office.id}`} checked={selectedOffices.includes(String(office.id))} onChange={() => handleOfficeChange(String(office.id))} />
                        <label className="form-check-label" htmlFor={`office-${office.id}`}>{office.name}</label>
                      </div>
                    </div>
                  ))}
                </div>
                <input type="text" className="form-control mt-2" readOnly value={selectedOffices.map(id => offices.find(o => String(o.id) === id)?.name).filter(Boolean).join(', ')} placeholder="Selected offices will appear here" />
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
                      <select
                        className="form-select"
                        value={selectedProfessors[officeId] || ''}
                        onChange={e => setSelectedProfessors(prev => ({ ...prev, [officeId]: e.target.value }))}
                        required
                      >
                        <option value="">Select Professor</option>
                        {(professorsByOffice[Number(officeId)] || []).map(prof => (
                          <option key={prof.id} value={prof.id}>{prof.name}</option>
                        ))}
                      </select>
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