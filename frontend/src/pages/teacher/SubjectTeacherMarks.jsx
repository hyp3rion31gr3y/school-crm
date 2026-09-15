import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

export default function SubjectTeacherMarks() {
  const [assignments, setAssignments] = useState([]);
  const [classSubjectId, setClassSubjectId] = useState('');
  const [classId, setClassId] = useState('');
  const [roster, setRoster] = useState([]);
  const [scores, setScores] = useState({});
  const [maxScore, setMaxScore] = useState(100);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiFetch('/api/marks').then((res) => {
      setAssignments(res.assignments || []);
      if (res.assignments?.[0]) {
        setClassSubjectId(res.assignments[0].id);
        setClassId(res.assignments[0].class_id);
      }
    }).catch((e) => setMsg(e.message));
  }, []);

  useEffect(() => {
    if (!classSubjectId) return;
    const a = assignments.find((x) => x.id === classSubjectId);
    if (a) setClassId(a.class_id);
  }, [classSubjectId, assignments]);

  useEffect(() => {
    if (!classId || !classSubjectId) return;
    // Roster via class students endpoint; existing marks via marks GET
    Promise.all([
      apiFetch(`/api/classes/${classId}/students`).catch(() => []),
      apiFetch(`/api/marks?class_subject_id=${classSubjectId}`).catch(() => []),
    ]).then(([students, marks]) => {
      setRoster(students);
      const init = {};
      (marks || []).forEach((m) => { init[m.student_id] = m.score; });
      setScores(init);
      if (marks?.[0]?.max_score) setMaxScore(marks[0].max_score);
    }).catch((e) => setMsg(e.message));
  }, [classId, classSubjectId]);

  async function save(student_id) {
    setMsg('');
    try {
      await apiFetch('/api/marks', {
        method: 'POST',
        body: { student_id, class_subject_id: classSubjectId, score: Number(scores[student_id]), max_score: Number(maxScore) },
      });
      setMsg(`Saved mark for ${student_id}.`);
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div>
      <h1>Subject Teacher — Marks</h1>
      {assignments.length === 0 ? (
        <p style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: 12, borderRadius: 8 }}>
          No subject assignments found for this login. Ask Reception or Principal to assign
          a class + subject first (Teachers directory, + Subject). Then reload this page.
        </p>
      ) : (
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={classSubjectId} onChange={(e) => setClassSubjectId(e.target.value)}>
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>{a.classObj?.name || 'Class'} · {a.subject?.name || 'Subject'}</option>
          ))}
        </select>
        <label>Max <input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} style={{ width: 80 }} /></label>
      </div>
      )}
      {msg && <p>{msg}</p>}
      <table border="1" cellPadding="6" style={{ background: '#fff', borderCollapse: 'collapse' }}>
        <thead><tr><th>Roll</th><th>Email</th><th>Score</th><th></th></tr></thead>
        <tbody>
          {roster.map((s) => (
            <tr key={s.student_id}>
              <td>{s.roll_number}</td>
              <td>{s.email}</td>
              <td>
                <input
                  type="number"
                  value={scores[s.student_id] ?? ''}
                  onChange={(e) => setScores({ ...scores, [s.student_id]: e.target.value })}
                  style={{ width: 80 }}
                /> / {maxScore}
              </td>
              <td><button onClick={() => save(s.student_id)}>Save</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
