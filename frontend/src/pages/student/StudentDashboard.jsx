import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

export default function StudentDashboard() {
  const [attendance, setAttendance] = useState({ rows: [], summary: {} });
  const [marks, setMarks] = useState([]);
  const [worksheets, setWorksheets] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch('/api/attendance/me'),
      apiFetch('/api/marks'),
      apiFetch('/api/worksheets'),
    ]).then(([att, mk, ws]) => {
      setAttendance(att);
      setMarks(mk || []);
      setWorksheets(ws || []);
    }).catch((e) => setMsg(e.message));
  }, []);

  const recent = (attendance.rows || []).slice(0, 10);

  return (
    <div>
      <h1>Student Dashboard</h1>
      {msg && <p>{msg}</p>}

      <h2>Recent Attendance</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {Object.entries(attendance.summary || {}).map(([k, v]) => (
          <span key={k} style={{ background: '#fff', padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}>
            <strong>{k}</strong>: {v}
          </span>
        ))}
      </div>
      <table border="1" cellPadding="6" style={{ background: '#fff', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead><tr><th>Date</th><th>Status</th></tr></thead>
        <tbody>
          {recent.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.date).toISOString().slice(0, 10)}</td>
              <td>{r.status}</td>
            </tr>
          ))}
          {recent.length === 0 && <tr><td colSpan="2">No attendance yet.</td></tr>}
        </tbody>
      </table>

      <h2>My Marks (read-only)</h2>
      <table border="1" cellPadding="6" style={{ background: '#fff', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead><tr><th>Subject</th><th>Score</th><th>Max</th></tr></thead>
        <tbody>
          {marks.map((m) => (
            <tr key={m.id}>
              <td style={{ fontSize: 12 }}>{m.class_subject_id}</td>
              <td>{m.score}</td>
              <td>{m.max_score}</td>
            </tr>
          ))}
          {marks.length === 0 && <tr><td colSpan="3">No marks yet.</td></tr>}
        </tbody>
      </table>

      <h2>Worksheets — my class</h2>
      <ul>
        {worksheets.map((w) => (
          <li key={w.id}>
            {w.title}{' '}
            <a href={w.file_url} target="_blank" rel="noreferrer" download>
              Download
            </a>
          </li>
        ))}
        {worksheets.length === 0 && <li>No worksheets for your class.</li>}
      </ul>
    </div>
  );
}
