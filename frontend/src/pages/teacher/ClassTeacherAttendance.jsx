import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

// Tri-state touch cycle: unmarked → PRESENT → ABSENT → unmarked.
const NEXT = { PRESENT: 'ABSENT', ABSENT: null };

export default function ClassTeacherAttendance() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState([]);
  const [marks, setMarks] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiFetch('/api/classes/mine').then(setClasses).catch((e) => setMsg(e.message));
  }, []);

  useEffect(() => {
    if (!classId) return;
    setMsg('');
    apiFetch(`/api/classes/${classId}/students`).then((rows) => {
      setRoster(rows);
      setMarks({});
    }).catch((e) => setMsg(e.message));
  }, [classId]);

  function cycle(userId) {
    setMarks((m) => {
      const cur = m[userId] || null;
      const next = cur ? NEXT[cur] : 'PRESENT';
      const copy = { ...m };
      if (next) copy[userId] = next;
      else delete copy[userId];
      return copy;
    });
  }

  const markedCount = Object.keys(marks).length;

  async function submit() {
    setBusy(true);
    setMsg('');
    try {
      const entries = Object.entries(marks);
      for (const [user_id, status] of entries) {
        await apiFetch('/api/attendance', {
          method: 'POST',
          body: { user_id, date, status },
        });
      }
      setMsg(`Saved attendance for ${entries.length} of ${roster.length} students on ${date}. Unmarked students skipped.`);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  function markAll(status) {
    const all = {};
    roster.forEach((s) => { all[s.user_id] = status; });
    setMarks(all);
  }

  return (
    <div>
      <h1>Class Teacher — Daily Attendance</h1>
      <p style={{ color: '#64748b', fontSize: 13 }}>Tap a student: Present (green) → Absent (red) → unmarked. Only marked students save.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c._count?.students ?? '?'} students)
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button disabled={roster.length === 0} onClick={() => markAll('PRESENT')}>All present</button>
        <button disabled={roster.length === 0} onClick={() => setMarks({})}>Clear</button>
        <button disabled={!classId || busy || markedCount === 0} onClick={submit}>
          {busy ? 'Saving…' : `Save marked (${markedCount})`}
        </button>
      </div>
      {msg && <p>{msg}</p>}
      <table border="1" cellPadding="6" style={{ background: '#fff', borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr><th>Roll</th><th>Student</th><th>Status</th></tr>
        </thead>
        <tbody>
          {roster.map((s) => {
            const st = marks[s.user_id] || null;
            const bg = st === 'PRESENT' ? '#dcfce7' : st === 'ABSENT' ? '#fee2e2' : '#fff';
            return (
              <tr
                key={s.student_id}
                onClick={() => cycle(s.user_id)}
                style={{ background: bg, cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation' }}
                title="Tap to cycle Present → Absent → unmarked"
              >
                <td>{s.roll_number}</td>
                <td style={{ fontWeight: 600, padding: '12px 8px' }}>{s.student_name || s.email}</td>
                <td style={{ fontWeight: 700, color: st === 'PRESENT' ? '#15803d' : st === 'ABSENT' ? '#b91c1c' : '#94a3b8' }}>
                  {st === 'PRESENT' ? 'Present' : st === 'ABSENT' ? 'Absent' : 'Tap to mark'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
