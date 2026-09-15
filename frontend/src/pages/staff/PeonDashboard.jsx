import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

export default function PeonDashboard() {
  const monthNow = new Date().toISOString().slice(0, 7);
  const [summary, setSummary] = useState({});
  const [monthRows, setMonthRows] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/attendance/me?month=${monthNow}`),
      apiFetch('/api/payroll/me?months=12'),
    ]).then(([att, pay]) => {
      setSummary(att.summary || {});
      setMonthRows(att.rows || []);
      setPayroll(pay || []);
    }).catch((e) => setMsg(e.message));
  }, [monthNow]);

  const totalPaid = payroll.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

  return (
    <div>
      <h1>Support Staff Dashboard</h1>
      {msg && <p>{msg}</p>}

      <h2>Attendance — {monthNow}</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {Object.entries(summary).map(([k, v]) => (
          <div key={k} style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <strong>{k}</strong>: {v}
          </div>
        ))}
        {Object.keys(summary).length === 0 && <span>No records this month.</span>}
      </div>
      <p style={{ color: '#6b7280', fontSize: 13 }}>{monthRows.length} day(s) recorded this month.</p>

      <h2>Payroll — last 12 months</h2>
      <p>Total paid (listed): <strong>{totalPaid.toFixed(2)}</strong></p>
      <table border="1" cellPadding="6" style={{ background: '#fff', borderCollapse: 'collapse' }}>
        <thead><tr><th>Payment date</th><th>Amount paid</th></tr></thead>
        <tbody>
          {payroll.map((p) => (
            <tr key={p.id}>
              <td>{new Date(p.payment_date).toISOString().slice(0, 10)}</td>
              <td>{Number(p.amount_paid).toFixed(2)}</td>
            </tr>
          ))}
          {payroll.length === 0 && <tr><td colSpan="2">No payroll history.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
