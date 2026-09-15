import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  Wallet,
  Banknote,
  Plus,
  Search,
  Inbox,
  Mail,
  Lock,
  Building2,
  User,
  Phone,
  IdCard,
  AtSign,
  Pencil,
  Check,
  X,
  KeyRound,
  Receipt,
  IndianRupee,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

const feeTotals = (f) => {
  const amount = Number(f?.amount || 0);
  const paid = (f?.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  return { amount, paid, balance: Math.max(0, Math.round((amount - paid) * 100) / 100) };
};

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const genderLabel = (g) => {
  const v = String(g || '').toUpperCase();
  return v === 'MALE' ? 'Male' : v === 'FEMALE' ? 'Female' : v === 'OTHER' ? 'Other' : '—';
};

// Bare login shown to families; stored as <login>@school.local for auth.
const loginIdOf = (email) => {
  const e = String(email || '').toLowerCase();
  return e.endsWith('@school.local') ? e.slice(0, -'@school.local'.length) : e;
};
const defaultLoginPreview = (name, aadhar) => {
  const first = String(name || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const last4 = String(aadhar || '').replace(/\D/g, '').slice(-4);
  return `${first || '…' }${last4}`;
};

const FEE_STATUSES = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'];

const TABS = [
  { id: 'students', label: 'Students', icon: Users },
  { id: 'teachers', label: 'Teachers', icon: GraduationCap },
];

export default function ReceptionDashboard({ initialTab = 'students', createMode = null }) {
  const [tab, setTab] = useState(initialTab);
  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const [msgKind, setMsgKind] = useState('error');
  const say = (m, kind = 'error') => { setMsgKind(kind); setMsg(m); };

  const [studentForm, setStudentForm] = useState({
    student_name: '',
    father_name: '',
    father_phone: '',
    mother_name: '',
    mother_phone: '',
    aadhar_number: '',
    current_class_id: '',
    login_id: '',
    gender: '',
  });
  const [teacherForm, setTeacherForm] = useState({ teacher_name: '', teacher_phone: '', email: '', password: '' });
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [classTeacherClassId, setClassTeacherClassId] = useState('');
  const [isSubjectTeacher, setIsSubjectTeacher] = useState(false);
  const [subjectDrafts, setSubjectDrafts] = useState([]);
  const [draftClassId, setDraftClassId] = useState('');
  const [draftSubjectId, setDraftSubjectId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [payForm, setPayForm] = useState({ user_id: '', amount_paid: '', payment_date: new Date().toISOString().slice(0, 10) });
  const [billForm, setBillForm] = useState({ student_id: '', title: '', amount: '', due_date: '' });
  const [collectingId, setCollectingId] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectNote, setCollectNote] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [payrollExpandedUser, setPayrollExpandedUser] = useState(null);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  async function load() {
    setMsg('');
    try {
      const [cls, students, pay, teacherList, subjectList] = await Promise.all([
        apiFetch('/api/classes/mine'),
        apiFetch('/api/admin/students'),
        apiFetch('/api/payroll').catch(() => []),
        apiFetch('/api/users?role=TEACHER').catch(() => []),
        apiFetch('/api/subjects').catch(() => []),
      ]);
      setClasses(cls);
      setRows(students);
      setPayroll(pay || []);
      setTeachers(teacherList || []);
      setSubjects(subjectList || []);
      if (!studentForm.current_class_id && cls[0]) {
        setStudentForm((f) => ({ ...f, current_class_id: cls[0].id }));
      }
    } catch (e) {
      say(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function addStudent(e) {
    e.preventDefault();
    say('');
    const digits = (v) => String(v || '').replace(/\D/g, '');
    if (!studentForm.student_name.trim() || !studentForm.father_name.trim() || !studentForm.mother_name.trim()) {
      say('Student, father + mother names required.');
      return;
    }
    if (digits(studentForm.father_phone).length !== 10 || digits(studentForm.mother_phone).length !== 10) {
      say('Father + mother mobile must be 10 digits each.');
      return;
    }
    if (digits(studentForm.aadhar_number).length !== 12) {
      say('Aadhar must be exactly 12 digits.');
      return;
    }
    if (!studentForm.current_class_id) {
      say('Select a class.');
      return;
    }
    if (!GENDERS.includes(String(studentForm.gender || '').toUpperCase())) {
      say('Select gender — Male, Female or Other.');
      return;
    }
    const customLogin = String(studentForm.login_id || '').trim().toLowerCase();
    if (customLogin && !/^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/.test(customLogin)) {
      say('Custom login: 3-32 chars, letters/digits, may contain . _ -');
      return;
    }
    try {
      const res = await apiFetch('/api/users', { method: 'POST', body: { ...studentForm, role: 'STUDENT' } });
      const creds = res?.credentials;
      setStudentForm({
        student_name: '',
        father_name: '',
        father_phone: '',
        mother_name: '',
        mother_phone: '',
        aadhar_number: '',
        current_class_id: studentForm.current_class_id,
        login_id: '',
        gender: '',
      });
      await load();
      say(
        creds
          ? `Admitted ${res?.studentProfile?.student_name || 'student'}. Login ID: ${creds.login_id} · Password: ${creds.password} (roll ${creds.roll_number}). Share it with the family.`
          : 'Student admitted + assigned to class.',
        'success'
      );
    } catch (err) {
      say(err.message);
    }
  }

  const subjectName = (id) => subjects.find((s) => s.id === id);
  const className = (id) => classes.find((c) => c.id === id);

  function addSubjectDraft() {
    if (!draftClassId || !draftSubjectId) return;
    if (subjectDrafts.some((d) => d.class_id === draftClassId && d.subject_id === draftSubjectId)) return;
    setSubjectDrafts([...subjectDrafts, { class_id: draftClassId, subject_id: draftSubjectId }]);
    setDraftClassId('');
    setDraftSubjectId('');
  }

  async function addTeacher(e) {
    e.preventDefault();
    say('');
    if (isSubjectTeacher && subjectDrafts.length === 0) {
      say('Add at least one class + subject, or uncheck Subject teacher.');
      return;
    }
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        body: {
          ...teacherForm,
          role: 'TEACHER',
          ...(isClassTeacher ? { class_teacher_class_id: classTeacherClassId } : {}),
          ...(isSubjectTeacher ? { subject_assignments: subjectDrafts } : {}),
        },
      });
      setTeacherForm({ teacher_name: '', teacher_phone: '', email: '', password: '' });
      setIsClassTeacher(false);
      setClassTeacherClassId('');
      setIsSubjectTeacher(false);
      setSubjectDrafts([]);
      setDraftClassId('');
      setDraftSubjectId('');
      await load();
      const post = res?.assignedClass ? ` Class teacher of ${res.assignedClass.name}.` : '';
      const subs = res?.assignedSubjects?.length ? ` Subject teacher for ${res.assignedSubjects.length} class-subject(s).` : '';
      say(`Teacher onboarded.${post}${subs}`, 'success');
    } catch (err) {
      say(err.message);
    }
  }

  async function updateSubjects(teacherId, pairs) {
    say('');
    try {
      await apiFetch(`/api/users/${teacherId}/subjects`, {
        method: 'PATCH',
        body: { assignments: pairs },
      });
      await load();
      say('Subject assignments updated.', 'success');
      return true;
    } catch (err) {
      say(err.message);
      return false;
    }
  }

  async function markClassTeacher(teacherId, classId) {
    if (!classId) return;
    setMsg('');
    try {
      const res = await apiFetch(`/api/users/${teacherId}/class-teacher`, {
        method: 'PATCH',
        body: { class_id: classId },
      });
      await load();
      say(`Marked as class teacher of ${res?.assignedClass?.name}.`.trim(), 'success');
    } catch (err) {
      say(err.message);
    }
  }

  async function unmarkClassTeacher(teacherId) {
    setMsg('');
    try {
      await apiFetch(`/api/users/${teacherId}/class-teacher`, {
        method: 'PATCH',
        body: { class_id: null },
      });
      await load();
      say('Class-teacher post cleared.', 'success');
    } catch (err) {
      say(err.message);
    }
  }

  async function resetPassword(student) {
    const login = student.login_id || loginIdOf(student.email);
    if (!window.confirm(`Reset password for ${student.student_name || login}? They will need the new temporary password to sign in.`)) return;
    say('');
    try {
      const res = await apiFetch(`/api/users/${student.user_id}/password`, { method: 'PATCH', body: {} });
      say(`Password for ${res.login_id} reset. New temporary password: ${res.password}. Share it with the family.`, 'success');
    } catch (err) {
      say(err.message);
    }
  }

  async function saveGender(studentId, gender) {
    say('');
    try {
      await apiFetch(`/api/admin/students/${studentId}`, { method: 'PATCH', body: { gender } });
      await load();
      say('Gender updated.', 'success');
      return true;
    } catch (err) {
      say(err.message);
      return false;
    }
  }

  async function renameLogin(userId, loginId) {
    say('');
    try {
      const updated = await apiFetch(`/api/users/${userId}/login`, {
        method: 'PATCH',
        body: { login_id: loginId },
      });
      await load();
      say(`Login updated to ${updated.login_id}.`, 'success');
      return true;
    } catch (err) {
      say(err.message);
      return false;
    }
  }

  async function billStudent(e) {
    e.preventDefault();
    say('');
    if (!billForm.student_id) { say('Select a student.'); return; }
    if (!(Number(billForm.amount) > 0)) { say('Amount must be greater than 0.'); return; }
    try {
      const created = await apiFetch('/api/fees', {
        method: 'POST',
        body: {
          student_id: billForm.student_id,
          title: billForm.title.trim() || 'Fee',
          amount: billForm.amount,
          ...(billForm.due_date ? { due_date: billForm.due_date } : {}),
        },
      });
      setBillForm({ student_id: '', title: '', amount: '', due_date: '' });
      await load();
      say(`Billed ${created.title} of ${Number(created.amount).toFixed(2)}.`, 'success');
    } catch (err) {
      say(err.message);
    }
  }

  async function collectFee(student, fee) {
    say('');
    if (!(Number(collectAmount) > 0)) { say('Enter an amount greater than 0.'); return; }
    try {
      const res = await apiFetch(`/api/fees/${fee.id}/payments`, {
        method: 'POST',
        body: { amount: collectAmount, note: collectNote.trim() },
      });
      setCollectingId(null);
      setCollectAmount('');
      setCollectNote('');
      await load();
      say(`Collected ${Number(res.payment.amount).toFixed(2)}. Balance: ${res.fee.balance.toFixed(2)}.`, 'success');
      setReceipt({ student, fee: res.fee, highlightPaymentId: res.payment.id });
    } catch (err) {
      say(err.message);
    }
  }

  async function updateFee(id, patch) {    say('');
    try {
      const updated = await apiFetch(`/api/fees/${id}`, { method: 'PATCH', body: patch });
      setRows(rows.map((s) => ({
        ...s,
        fees: s.fees.map((f) => (f.id === id ? { ...f, ...updated } : f)),
      })));
    } catch (err) {
      say(err.message);
    }
  }

  async function payStaff(e) {
    e.preventDefault();
    setMsg('');
    try {
      const created = await apiFetch('/api/payroll', { method: 'POST', body: payForm });
      setPayroll([created, ...payroll]);
      say('Payroll recorded.', 'success');
    } catch (err) {
      say(err.message);
    }
  }

  const classNumber = (c) => parseInt(String(c?.name || '').replace(/\D/g, ''), 10) || 0;
  const sortedClasses = useMemo(() => [...classes].sort((a, b) => classNumber(a) - classNumber(b)), [classes]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) =>
      [
        s.email,
        s.login_id,
        s.roll_number,
        s.student_name,
        s.father_name,
        s.father_phone,
        s.mother_name,
        s.mother_phone,
        s.aadhar_number,
        s.gender,
        `${s.class?.name || ''}`,
      ].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [rows, query]);

  const feeRows = useMemo(
    () =>
      filteredRows.flatMap((s) =>
        (s.fees || []).map((f) => ({ student: s, fee: f }))
      ),
    [filteredRows]
  );

  const studentFeeSummary = (s) => {
    const fees = s?.fees || [];
    const billed = fees.reduce((sum, f) => sum + Number(f?.amount || 0), 0);
    const paid = fees.reduce(
      (sum, f) => sum + (f?.payments || []).reduce((a, p) => a + Number(p?.amount || 0), 0),
      0
    );
    return { billed, paid, due: Math.max(0, Math.round((billed - paid) * 100) / 100), count: fees.length };
  };

  const classCounts = useMemo(() => {
    const map = new Map();
    rows.forEach((s) => {
      const id = s.class?.id || 'unassigned';
      map.set(id, (map.get(id) || 0) + 1);
    });
    return map;
  }, [rows]);

  const classFilteredRows = useMemo(() => {
    if (selectedClassId === 'all') return filteredRows;
    return filteredRows.filter((s) => (s.class?.id || 'unassigned') === selectedClassId);
  }, [filteredRows, selectedClassId]);

  const payrollByUser = useMemo(() => {
    const map = new Map();
    (payroll || []).forEach((p) => {
      const key = String(p.user_id || 'unknown');
      if (!map.has(key)) map.set(key, { user_id: p.user_id, total: 0, entries: [] });
      const g = map.get(key);
      g.total += Number(p.amount_paid || 0);
      g.entries.push(p);
    });
    return [...map.values()].map((g) => ({
      ...g,
      entries: g.entries.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)),
    }));
  }, [payroll]);

  if (createMode === 'student') {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Link to="/users" className="text-sm font-medium text-indigo-600 hover:underline">← Back to students</Link>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Admit student</h2>
          <p className="mt-0.5 text-xs text-slate-500">Login defaults to firstname + last 4 of Aadhar. Password + roll auto-generated.</p>
          {msg && (
            <div role={msgKind === 'success' ? 'status' : 'alert'} className={`mt-3 rounded-xl border px-4 py-3 text-sm ${msgKind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              {msg}
            </div>
          )}
          <form onSubmit={addStudent} className="mt-4 space-y-3">
            <Field icon={User} placeholder="Student name *" value={studentForm.student_name} onChange={(e) => setStudentForm({ ...studentForm, student_name: e.target.value })} required />
            <div className="grid grid-cols-[1fr_130px] gap-2">
              <Field icon={User} placeholder="Father's name *" value={studentForm.father_name} onChange={(e) => setStudentForm({ ...studentForm, father_name: e.target.value })} required />
              <Field icon={Phone} placeholder="Phone *" inputMode="numeric" maxLength={10} value={studentForm.father_phone} onChange={(e) => setStudentForm({ ...studentForm, father_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} required />
            </div>
            <div className="grid grid-cols-[1fr_130px] gap-2">
              <Field icon={User} placeholder="Mother's name *" value={studentForm.mother_name} onChange={(e) => setStudentForm({ ...studentForm, mother_name: e.target.value })} required />
              <Field icon={Phone} placeholder="Phone *" inputMode="numeric" maxLength={10} value={studentForm.mother_phone} onChange={(e) => setStudentForm({ ...studentForm, mother_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} required />
            </div>
            <Field icon={IdCard} placeholder="Aadhar number — 12 digits *" inputMode="numeric" maxLength={12} value={studentForm.aadhar_number} onChange={(e) => setStudentForm({ ...studentForm, aadhar_number: e.target.value.replace(/\D/g, '').slice(0, 12) })} required />
            <Field icon={AtSign} placeholder="Custom login (optional)" value={studentForm.login_id} onChange={(e) => setStudentForm({ ...studentForm, login_id: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 32) })} />
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select value={studentForm.current_class_id} onChange={(e) => setStudentForm({ ...studentForm, current_class_id: e.target.value })} required className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                <option value="">Select class *</option>
                {sortedClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select value={studentForm.gender} onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })} required className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                <option value="">Gender *</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <button type="submit" className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800">
              <Plus className="h-4 w-4" />
              Admit student
            </button>
          </form>
        </section>
      </div>
    );
  }

  if (createMode === 'teacher') {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Link to="/users" className="text-sm font-medium text-indigo-600 hover:underline">← Back to teachers</Link>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Add teacher</h2>
          <p className="mt-0.5 text-xs text-slate-500">They sign in immediately with these credentials.</p>
          {msg && (
            <div role={msgKind === 'success' ? 'status' : 'alert'} className={`mt-3 rounded-xl border px-4 py-3 text-sm ${msgKind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              {msg}
            </div>
          )}
          <form onSubmit={addTeacher} className="mt-4 space-y-3">
            <Field icon={User} placeholder="Teacher name *" value={teacherForm.teacher_name} onChange={(e) => setTeacherForm({ ...teacherForm, teacher_name: e.target.value })} required />
            <Field icon={Phone} placeholder="Phone — 10 digits *" inputMode="numeric" maxLength={10} value={teacherForm.teacher_phone} onChange={(e) => setTeacherForm({ ...teacherForm, teacher_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} required />
            <Field icon={Mail} placeholder="teacher@school.local *" type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} required />
            <Field icon={Lock} placeholder="Temporary password *" type="password" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} required />
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-700">
              <input type="checkbox" checked={isClassTeacher} onChange={(e) => setIsClassTeacher(e.target.checked)} className="h-4 w-4 rounded accent-zinc-950" />
              Class teacher
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-700">
              <input type="checkbox" checked={isSubjectTeacher} onChange={(e) => setIsSubjectTeacher(e.target.checked)} className="h-4 w-4 rounded accent-zinc-950" />
              Subject teacher
            </label>
            {isClassTeacher && (
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select value={classTeacherClassId} onChange={(e) => setClassTeacherClassId(e.target.value)} required className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                  <option value="">Class teacher of which class? *</option>
                  {sortedClasses.map((c) => (
                    <option key={c.id} value={c.id} disabled={!!c.class_teacher_id}>
                      {c.name}{c.class_teacher_id ? ' (occupied)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {isSubjectTeacher && (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <select value={draftClassId} onChange={(e) => setDraftClassId(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                    <option value="">Class…</option>
                    {sortedClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={draftSubjectId} onChange={(e) => setDraftSubjectId(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                    <option value="">Subject…</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <button type="button" onClick={addSubjectDraft} disabled={!draftClassId || !draftSubjectId} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40">
                  + Add class + subject
                </button>
                {subjectDrafts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {subjectDrafts.map((d) => (
                      <span key={`${d.class_id}:${d.subject_id}`} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                        {className(d.class_id)?.name} · {subjectName(d.subject_id)?.name}
                        <button type="button" onClick={() => setSubjectDrafts(subjectDrafts.filter((x) => !(x.class_id === d.class_id && x.subject_id === d.subject_id)))} className="rounded-full p-0.5 hover:bg-indigo-100" aria-label="Remove">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button type="submit" className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800">
              <Plus className="h-4 w-4" />
              Add teacher
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">People &amp; Payments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Onboard students and staff, track fees, disburse payroll — all from one desk.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, aadhar, phone, roll…"
            className="w-64 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-zinc-950 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {msg && (
        <div
          role={msgKind === 'success' ? 'status' : 'alert'}
          className={`rounded-xl border px-4 py-3 text-sm ${
            msgKind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {msg}
        </div>
      )}

      {tab === 'students' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
          {/* Classes browser — click a class to filter its students */}
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-baseline justify-between px-1 pb-3">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Classes</h2>
              <span className="text-xs tabular-nums text-slate-400">{rows.length} total</span>
            </div>
            <div className="space-y-1.5">
              <button
                onClick={() => { setSelectedClassId('all'); setExpandedStudentId(null); }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${selectedClassId === 'all' ? 'bg-zinc-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                All students
                <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${selectedClassId === 'all' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                  {rows.length}
                </span>
              </button>
              {sortedClasses.map((c) => {
                const active = selectedClassId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedClassId(c.id); setExpandedStudentId(null); }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-zinc-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {c.name}
                    <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                      {classCounts.get(c.id) || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          {/* Students directory — click a row for full fee history */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-semibold tracking-tight text-slate-900">
                  {selectedClassId === 'all'
                    ? 'Students'
                    : `${sortedClasses.find((c) => c.id === selectedClassId)?.name || 'Class'} students`}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
                  {classFilteredRows.length}
                </span>
              </div>
              <Link to="/attendance" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
                Take attendance
              </Link>
            </div>
            {classFilteredRows.length === 0 ? (
              <EmptyState title="No students found" hint="Pick another class, admit a student from the side menu, or clear your search." />
            ) : (
              <DataTable head={['Student', 'Login', 'Gender', 'Class', "Father", 'Aadhar', 'Due']}>
                {classFilteredRows.map((s) => {
                  const summary = studentFeeSummary(s);
                  const expanded = expandedStudentId === s.student_id;
                  return (
                    <Fragment key={s.student_id}>
                      <tr
                        onClick={() => {
                          setExpandedStudentId(expanded ? null : s.student_id);
                          setBillForm((b) => ({ ...b, student_id: s.student_id }));
                        }}
                        className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${expanded ? 'bg-indigo-50/40' : ''}`}
                        title="Click for complete fee history"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-900">{s.student_name || '—'}</p>
                          <p className="text-xs tabular-nums text-slate-400">Roll {s.roll_number}</p>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <LoginCell student={s} onSave={renameLogin} onReset={resetPassword} />
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <GenderCell student={s} onSave={saveGender} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-600/10">
                            {s.class?.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-600">{s.father_name || '—'}</p>
                          <p className="text-xs tabular-nums text-slate-400">{s.father_phone || ''}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-500">
                          {s.aadhar_number ? `•••• •••• ${String(s.aadhar_number).slice(-4)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold tabular-nums text-slate-900">
                          {summary.due.toFixed(2)}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan="7" className="px-4 py-4">
                            <StudentFeeHistory
                              student={s}
                              summary={summary}
                              onCollect={(fee) => { setCollectingId(fee.id); setCollectAmount(String(feeTotals(fee).balance.toFixed(2))); setCollectNote(''); }}
                              collectingId={collectingId}
                              collectAmount={collectAmount}
                              setCollectAmount={setCollectAmount}
                              collectNote={collectNote}
                              setCollectNote={setCollectNote}
                              onConfirmCollect={collectFee}
                              onCancelCollect={() => setCollectingId(null)}
                              onReceipt={(fee) => setReceipt({ student: s, fee })}
                              billForm={billForm}
                              setBillForm={setBillForm}
                              onBill={billStudent}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </DataTable>
            )}
          </section>
        </div>
      )}

      {tab === 'teachers' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Teachers</h2>
            <p className="mt-1 text-xs text-slate-500">Add new teachers from the side menu.</p>
            <p className="mt-3 text-xs text-slate-400">Set class-teacher post + subjects from directory.</p>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-baseline gap-2 border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Teachers</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
                {teachers.length}
              </span>
            </div>
            {teachers.length === 0 ? (
              <EmptyState title="No teachers yet" hint="Onboard the first teacher with the form." />
            ) : (
              <DataTable head={['Teacher', 'Phone', 'Class teacher', 'Subjects', 'Post']}>
                {teachers.map((t) => {
                  const post = classes.find((c) => c.class_teacher_id === t.id);
                  return (
                    <TeacherRow
                      key={t.id}
                      teacher={t}
                      post={post}
                      freeClasses={classes.filter((c) => !c.class_teacher_id)}
                      allClasses={classes}
                      subjects={subjects}
                      onMark={markClassTeacher}
                      onUnmark={unmarkClassTeacher}
                      onUpdateSubjects={updateSubjects}
                    />
                  );
                })}
              </DataTable>
            )}
          </section>
        </div>
      )}

      
      {receipt && (
        <ReceiptModal
          student={receipt.student}
          fee={receipt.fee}
          highlightPaymentId={receipt.highlightPaymentId}
          onClose={() => setReceipt(null)}
        />
      )}

      {tab === 'payroll' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Pay staff</h2>
            <p className="mt-0.5 text-xs text-slate-500">Record a disbursement against a staff user ID.</p>
            <form onSubmit={payStaff} className="mt-4 space-y-3">
              <Field placeholder="Staff user ID" value={payForm.user_id} onChange={(e) => setPayForm({ ...payForm, user_id: e.target.value })} required />
              <Field placeholder="Amount" type="number" step="0.01" value={payForm.amount_paid} onChange={(e) => setPayForm({ ...payForm, amount_paid: e.target.value })} required />
              <input
                type="date"
                value={payForm.payment_date}
                onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                <Plus className="h-4 w-4" />
                Record payment
              </button>
            </form>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <button
              onClick={() => setPayrollOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 text-left"
            >
              <span className="flex items-baseline gap-2">
                <span className="text-base font-semibold tracking-tight text-slate-900">Payroll history</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
                  {payroll.length}
                </span>
              </span>
              <span className="text-xs font-medium text-slate-500">{payrollOpen ? 'Collapse' : 'Expand'}</span>
            </button>
            {payrollOpen && (
              payrollByUser.length === 0 ? (
                <EmptyState title="No payroll yet" hint="Record the first staff payment with the form." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {payrollByUser.map((g) => {
                    const open = payrollExpandedUser === String(g.user_id);
                    return (
                      <div key={String(g.user_id)}>
                        <button
                          onClick={() => setPayrollExpandedUser(open ? null : String(g.user_id))}
                          className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-slate-50/80"
                        >
                          <span className="font-mono text-xs text-slate-600">{String(g.user_id).slice(0, 16)}…</span>
                          <span className="flex items-center gap-3">
                            <span className="text-sm font-semibold tabular-nums text-slate-900">{Number(g.total).toFixed(2)}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600">{g.entries.length}</span>
                            <span className="text-xs text-slate-400">{open ? 'Hide' : 'Show'}</span>
                          </span>
                        </button>
                        {open && (
                          <div className="bg-slate-50/60 px-5 pb-4">
                            <DataTable head={['Date', 'Amount']}>
                              {g.entries.map((p) => (
                                <tr key={p.id} className="transition-colors hover:bg-slate-50/80">
                                  <td className="px-4 py-2.5 text-sm tabular-nums text-slate-500">
                                    {String(p.payment_date).slice(0, 10)}
                                  </td>
                                  <td className="px-4 py-2.5 text-sm font-semibold tabular-nums text-slate-900">
                                    {Number(p.amount_paid).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </DataTable>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function StudentFeeHistory({ student, summary, onCollect, collectingId, collectAmount, setCollectAmount, collectNote, setCollectNote, onConfirmCollect, onCancelCollect, onReceipt, billForm, setBillForm, onBill }) {
  const fees = [...(student.fees || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total fees</p>
          <p className="text-base font-bold tabular-nums text-slate-900">{summary.billed.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-600">Total paid</p>
          <p className="text-base font-bold tabular-nums text-emerald-700">{summary.paid.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-rose-50 px-3 py-2.5 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-rose-500">Total due</p>
          <p className="text-base font-bold tabular-nums text-rose-700">{summary.due.toFixed(2)}</p>
        </div>
      </div>
      {fees.length === 0 ? (
        <p className="text-sm text-slate-400">No bills raised for this student yet.</p>
      ) : (
        <div className="space-y-3">
          {fees.map((f) => {
            const t = feeTotals(f);
            const payments = [...(f.payments || [])].sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
            const collecting = collectingId === f.id;
            return (
              <div key={f.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{f.title || 'Fee'}</p>
                    <p className="text-xs tabular-nums text-slate-400">
                      Billed {t.amount.toFixed(2)} · Paid {t.paid.toFixed(2)} · Due {t.balance.toFixed(2)}
                      {f.due_date ? ` · Due ${String(f.due_date).slice(0, 10)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={f.status} />
                    {collecting ? (
                      <span className="flex items-center gap-1.5">
                        <input
                          type="number" step="0.01" min="1" value={collectAmount}
                          onChange={(e) => setCollectAmount(e.target.value)}
                          placeholder={`Max ${t.balance.toFixed(2)}`}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-xs tabular-nums focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        <button title="Save payment" onClick={() => onConfirmCollect(student, f)} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50">
                          <Check className="h-4 w-4" />
                        </button>
                        <button title="Cancel" onClick={onCancelCollect} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                          <X className="h-4 w-4" />
                        </button>
                      </span>
                    ) : (
                      <>
                        <button
                          title="Collect payment" disabled={t.balance <= 0}
                          onClick={() => onCollect(f)}
                          className="inline-flex items-center gap-1 rounded-lg bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
                        >
                          <IndianRupee className="h-3.5 w-3.5" />
                          Collect
                        </button>
                        <button title="Print receipt" onClick={() => onReceipt(f)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800">
                          <Receipt className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {collecting && (
                  <input
                    value={collectNote} onChange={(e) => setCollectNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                )}
                <table className="mt-2 w-full text-xs">
                  <thead>
                    <tr className="text-left uppercase tracking-wider text-slate-400">
                      <th className="py-1 pr-2 font-semibold">Paid on</th>
                      <th className="py-1 pr-2 font-semibold">Note</th>
                      <th className="py-1 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 && (
                      <tr><td colSpan="3" className="py-1.5 text-slate-400">No payments yet.</td></tr>
                    )}
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-1.5 pr-2 tabular-nums text-slate-600">{String(p.paid_at).slice(0, 10)}</td>
                        <td className="py-1.5 pr-2 text-slate-600">{p.note || '—'}</td>
                        <td className="py-1.5 text-right font-semibold tabular-nums text-slate-900">{Number(p.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
      <form onSubmit={onBill} className="flex flex-wrap items-center gap-2 border-t border-dashed border-slate-200 pt-3">
        <input
          placeholder="New bill title" value={billForm.title || ''}
          onChange={(e) => setBillForm({ ...billForm, student_id: student.student_id, title: e.target.value })}
          className="min-w-[140px] flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <input
          placeholder="Amount" type="number" step="0.01" min="1" value={billForm.amount || ''}
          onChange={(e) => setBillForm({ ...billForm, student_id: student.student_id, amount: e.target.value })}
          className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-xs tabular-nums focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800">
          <Plus className="h-3.5 w-3.5" />
          Raise bill
        </button>
      </form>
    </div>
  );
}

function LoginCell({ student: s, onSave, onReset }) {
  const current = s.login_id || loginIdOf(s.email);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(current); }, [current]);
  async function submit() {
    const v = String(draft || '').trim().toLowerCase();
    if (!v || v === current) { setEditing(false); return; }
    setSaving(true);
    const ok = await onSave(s.user_id, v);
    setSaving(false);
    if (ok) setEditing(false);
  }
  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono text-xs font-semibold text-slate-700">{current}</span>
        <button
          title="Edit login"
          onClick={() => { setDraft(current); setEditing(true); }}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          title="Reset password"
          onClick={() => onReset(s)}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-amber-600"
        >
          <KeyRound className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 32))}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false);
          if (e.key === 'Enter') { e.preventDefault(); submit(); }
        }}
        className="w-28 rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
      <button
        title="Save"
        disabled={saving || !draft.trim()}
        onClick={submit}
        className="rounded-md p-1 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-40"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        title="Cancel"
        onClick={() => setEditing(false)}
        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function GenderCell({ student: s, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(s.gender || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setValue(s.gender || ''); }, [s.gender]);
  async function submit(v) {
    if (!v || v === (s.gender || '')) { setEditing(false); return; }
    setSaving(true);
    const ok = await onSave(s.student_id, v);
    setSaving(false);
    if (ok) setEditing(false);
  }
  if (!editing) {
    const missing = !s.gender;
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
          missing
            ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
            : 'bg-slate-100 text-slate-600 ring-slate-600/10'
        }`}>
          {genderLabel(s.gender)}
        </span>
        <button
          title={missing ? 'Set gender' : 'Edit gender'}
          onClick={() => setEditing(true)}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }
  return (
    <select
      autoFocus
      value={value}
      disabled={saving}
      onChange={(e) => submit(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
      onBlur={() => setEditing(false)}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
    >
      <option value="">Select…</option>
      <option value="MALE">Male</option>
      <option value="FEMALE">Female</option>
      <option value="OTHER">Other</option>
    </select>
  );
}

function TeacherRow({ teacher: t, post, freeClasses, allClasses, subjects, onMark, onUnmark, onUpdateSubjects }) {
  const [pick, setPick] = useState('');
  const [adding, setAdding] = useState(false);
  const [addClass, setAddClass] = useState('');
  const [addSubject, setAddSubject] = useState('');
  const num = (c) => parseInt(String(c?.name || '').replace(/\D/g, ''), 10) || 0;
  const orderedFree = [...freeClasses].sort((a, b) => num(a) - num(b));
  const orderedClasses = [...(allClasses || [])].sort((a, b) => num(a) - num(b));
  const assigned = t.classesTeaching || [];
  const currentPairs = assigned.map((a) => ({ class_id: a.class_id, subject_id: a.subject_id }));

  async function removeSubject(classId, subjectId) {
    await onUpdateSubjects(t.id, currentPairs.filter((p) => !(p.class_id === classId && p.subject_id === subjectId)));
  }
  async function saveNewSubject() {
    if (!addClass || !addSubject) return;
    if (currentPairs.some((p) => p.class_id === addClass && p.subject_id === addSubject)) {
      setAdding(false);
      return;
    }
    const ok = await onUpdateSubjects(t.id, [...currentPairs, { class_id: addClass, subject_id: addSubject }]);
    if (ok) { setAdding(false); setAddClass(''); setAddSubject(''); }
  }

  return (
    <tr className="transition-colors hover:bg-slate-50/80">
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{t.display_name || '—'}</p>
        <p className="text-xs text-slate-400">{t.email}</p>
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-slate-500">{t.phone || '—'}</td>
      <td className="px-4 py-3">
        {post ? (
          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            {post.name}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex max-w-[260px] flex-wrap items-center gap-1.5">
          {assigned.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              {a.classObj?.name} · {a.subject?.name}
              <button
                title="Unassign"
                onClick={() => removeSubject(a.class_id, a.subject_id)}
                className="rounded-full p-0.5 hover:bg-indigo-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {adding ? (
            <span className="inline-flex items-center gap-1">
              <select
                value={addClass}
                onChange={(e) => setAddClass(e.target.value)}
                className="max-w-[110px] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs focus:border-indigo-400 focus:outline-none"
              >
                <option value="">Class…</option>
                {orderedClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                value={addSubject}
                onChange={(e) => setAddSubject(e.target.value)}
                className="max-w-[130px] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs focus:border-indigo-400 focus:outline-none"
              >
                <option value="">Subject…</option>
                {(subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button
                title="Save"
                disabled={!addClass || !addSubject}
                onClick={saveNewSubject}
                className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                title="Cancel"
                onClick={() => setAdding(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <button
              title="Assign subject"
              onClick={() => setAdding(true)}
              className="rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-xs font-medium text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600"
            >
              + Subject
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {post ? (
          <button
            onClick={() => onUnmark(t.id)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-rose-600"
          >
            Unmark
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="max-w-[130px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
            >
              <option value="">Class…</option>
              {orderedFree.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={() => onMark(t.id, pick)}
              disabled={!pick}
              className="rounded-lg bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
            >
              Mark
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function ReceiptModal({ student: s, fee: f, highlightPaymentId, onClose }) {
  const t = feeTotals(f);
  const payments = [...(f.payments || [])].sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-zinc-950/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="print-receipt rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="border-b border-dashed border-slate-200 pb-4 text-center">
            <p className="text-lg font-bold tracking-tight text-slate-900">School CRM</p>
            <p className="text-xs uppercase tracking-widest text-slate-400">Fee receipt</p>
            <p className="mt-1 font-mono text-xs text-slate-500">No. {String(f.id).slice(0, 8).toUpperCase()}</p>
          </div>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Student</dt><dd className="font-semibold text-slate-900">{s.student_name}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Roll</dt><dd className="tabular-nums text-slate-700">{s.roll_number}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Class</dt><dd className="text-slate-700">{s.class?.name}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Bill</dt><dd className="text-slate-700">{f.title || 'Fee'}</dd></div>
          </dl>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="py-1.5 pr-2 font-semibold">Date</th>
                <th className="py-1.5 pr-2 font-semibold">Note</th>
                <th className="py-1.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 && (
                <tr><td colSpan="3" className="py-2 text-xs text-slate-400">No payments collected yet.</td></tr>
              )}
              {payments.map((p) => (
                <tr key={p.id} className={p.id === highlightPaymentId ? 'bg-emerald-50/60' : ''}>
                  <td className="py-1.5 pr-2 tabular-nums text-slate-600">{String(p.paid_at).slice(0, 10)}</td>
                  <td className="py-1.5 pr-2 text-slate-600">{p.note || '—'}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums text-slate-900">{Number(p.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-4 space-y-1.5 border-t border-dashed border-slate-200 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Billed</dt><dd className="tabular-nums text-slate-900">{t.amount.toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Paid</dt><dd className="tabular-nums text-emerald-700">{t.paid.toFixed(2)}</dd></div>
            <div className="flex justify-between text-base"><dt className="font-semibold text-slate-900">Balance</dt><dd className="font-bold tabular-nums text-slate-900">{t.balance.toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-semibold text-slate-700">{f.status}</dd></div>
          </dl>
          <div className="no-print mt-5 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 rounded-xl bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      )}
      <input
        {...props}
        className={`w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${Icon ? 'pl-9' : 'pl-3'}`}
      />
    </div>
  );
}

function Step({ n, text }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
        {n}
      </span>
      <span>{text}</span>
    </li>
  );
}

function DataTable({ head, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50/50">
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Inbox className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = String(status).toUpperCase();
  const cls = s.includes('PAID')
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    : s.includes('PARTIAL')
      ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
      : s.includes('OVERDUE')
        ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
        : 'bg-amber-50 text-amber-700 ring-amber-600/20';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
}
