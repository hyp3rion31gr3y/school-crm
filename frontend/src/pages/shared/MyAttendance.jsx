import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

export default function MyAttendance({ title = 'My Attendance' }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setMsg('');
    apiFetch(`/api/attendance/me?month=${month}`)
      .then((d) => { setRows(d.rows || []); setSummary(d.summary || {}); })
      .catch((e) => setMsg(e.message));
  }, [month]);

  return (
    <div>
      <h1>{title}</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      {msg && <p>{msg}</p>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {Object.entries(summary).map(([k, v]) => (
          <div key={k} style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <strong>{k}</strong>: {v}
          </div>
        ))}
        {Object.keys(summary).length === 0 && <span style={{ color: '#6b7280' }}>No records this month.</span>}
      </div>
      <table border="1" cellPadding="6" style={{ background: '#fff', borderCollapse: 'collapse' }}>
        <thead><tr><th>Date</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.date).toISOString().slice(0, 10)}</td>
              <td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
