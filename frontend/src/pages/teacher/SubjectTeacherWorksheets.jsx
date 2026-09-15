import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';

export default function SubjectTeacherWorksheets() {
  const { currentUser } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [worksheets, setWorksheets] = useState([]);
  const [form, setForm] = useState({ title: '', file_url: '', class_subject_id: '' });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');

  async function load() {
    const [marksRes, cls, subs] = await Promise.all([
      apiFetch('/api/marks'),
      apiFetch('/api/classes/mine').catch(() => []),
      apiFetch('/api/subjects').catch(() => []),
    ]);
    const list = marksRes.assignments || [];
    setAssignments(list);
    setClasses(Array.isArray(cls) ? cls : []);
    setSubjects(Array.isArray(subs) ? subs : []);
    const ws = await apiFetch('/api/worksheets');
    setWorksheets(ws);
    if (!form.class_subject_id && list[0]) {
      setForm((f) => ({ ...f, class_subject_id: list[0].id }));
    }
  }

  useEffect(() => { load().catch((e) => setMsg(e.message)); }, []);

  const classNameOf = (a) => a?.classObj?.name || classes.find((c) => c.id === a?.class_id)?.name || 'Class';
  const subjectNameOf = (a) => a?.subject?.name || subjects.find((s) => s.id === a?.subject_id)?.name || 'Subject';
  const assignmentLabel = (a) => `${classNameOf(a)} · ${subjectNameOf(a)}`;

  // S3/MinIO integration point: swap this stub for a presigned-POST upload,
  // then set file_url to the returned object URL.
  function handleFilePick(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f && !form.file_url) setForm((prev) => ({ ...prev, file_url: `s3://worksheets/${f.name}` }));
  }

  async function upload(e) {
    e.preventDefault();
    setMsg('');
    try {
      const created = await apiFetch('/api/worksheets', { method: 'POST', body: form });
      setWorksheets([created, ...worksheets]);
      setForm({ title: '', file_url: '', class_subject_id: form.class_subject_id });
      setFile(null);
      setMsg('Worksheet uploaded.');
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function remove(id) {
    setMsg('');
    try {
      await apiFetch(`/api/worksheets/${id}`, { method: 'DELETE' });
      setWorksheets(worksheets.filter((w) => w.id !== id));
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div>
      <h1>Subject Teacher — Worksheets</h1>
      {assignments.length === 0 ? (
        <p style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: 12, borderRadius: 8 }}>
          No subject assignments found for this login. Ask Reception or Principal to assign
          a class + subject first (Teachers directory, + Subject). Then reload this page.
        </p>
      ) : (
      <form onSubmit={upload} style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select
          value={form.class_subject_id}
          onChange={(e) => setForm({ ...form, class_subject_id: e.target.value })}
          required
        >
          <option value="">Select class + subject</option>
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>{assignmentLabel(a)}</option>
          ))}
        </select>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input placeholder="file_url (S3/MinIO)" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} required style={{ minWidth: 260 }} />
        <input type="file" onChange={handleFilePick} />
        <button type="submit" disabled={!form.class_subject_id}>Upload</button>
      </form>
      )}
      {file && <p>Selected: {file.name} — stub maps to file_url above. Plug S3 presigned upload here.</p>}
      {msg && <p>{msg}</p>}
      <table border="1" cellPadding="6" style={{ background: '#fff', borderCollapse: 'collapse' }}>
        <thead><tr><th>Title</th><th>Subject</th><th>Actions</th></tr></thead>
        <tbody>
          {worksheets.map((w) => {
            const isOwner = w.uploaded_by === currentUser?.id || w.canEdit;
            return (
              <tr key={w.id}>
                <td>{w.title}</td>
                <td style={{ fontSize: 12 }}>{w.class_subject_id}</td>
                <td>
                  {/* Hide Edit/Delete unless logged-in teacher is uploader */}
                  {isOwner ? (
                    <button onClick={() => remove(w.id)}>Delete</button>
                  ) : (
                    <span style={{ color: '#6b7280', fontSize: 12 }}>read-only</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
