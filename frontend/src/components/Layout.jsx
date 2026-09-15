import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardCheck,
  Wallet,
  Banknote,
  CalendarCheck,
  Home,
  Bell,
  LogOut,
  GraduationCap,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../lib/api';

const ICONS = {
  Dashboard: Home,
  Overview: LayoutDashboard,
  Users: Users,
  'All Users': Users,
  'Admit Student': Users,
  'Add Teacher': GraduationCap,
  Worksheets: FileText,
  'Upload Worksheets': FileText,
  Marks: ClipboardCheck,
  Fees: Wallet,
  'Fee Status': Wallet,
  Payroll: Banknote,
  'My Payroll': Banknote,
  Attendance: CalendarCheck,
  'My Attendance': CalendarCheck,
  'My Marks': GraduationCap,
};

const LINKS_BY_ROLE = {
  TEACHER: [
    { to: '/', label: 'Dashboard' },
    { to: '/worksheets', label: 'Upload Worksheets' },
    { to: '/marks', label: 'Marks' },
    { to: '/attendance', label: 'Attendance' },
  ],
  STUDENT: [
    { to: '/', label: 'Dashboard' },
    { to: '/my-worksheets', label: 'Worksheets' },
    { to: '/my-marks', label: 'My Marks' },
    { to: '/my-attendance', label: 'My Attendance' },
  ],
  RECEPTION: [
    { to: '/', label: 'Dashboard' },
    { to: '/users', label: 'All Users' },
    { to: '/students/new', label: 'Admit Student' },
    { to: '/teachers/new', label: 'Add Teacher' },
    { to: '/attendance', label: 'Attendance' },
    { to: '/payroll', label: 'Payroll' },
  ],
  PEON: [
    { to: '/', label: 'Dashboard' },
    { to: '/my-attendance', label: 'My Attendance' },
    { to: '/my-payroll', label: 'My Payroll' },
  ],
  PRINCIPAL: [
    { to: '/overview', label: 'Overview' },
    { to: '/users', label: 'All Users' },
    { to: '/students/new', label: 'Admit Student' },
    { to: '/teachers/new', label: 'Add Teacher' },
    { to: '/worksheets', label: 'Worksheets' },
    { to: '/marks', label: 'Marks' },
    { to: '/attendance', label: 'Attendance' },
    { to: '/payroll', label: 'Payroll' },
  ],
};

function Breadcrumbs({ path }) {
  const parts = path.split('/').filter(Boolean);
  if (!parts.length) return <span className="text-slate-900 font-semibold">Dashboard</span>;
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <span className="text-slate-400">Home</span>
      {parts.map((p) => (
        <span key={p} className="flex items-center gap-1.5">
          <span className="text-slate-300">/</span>
          <span className="capitalize text-slate-900 font-medium">{p.replace(/-/g, ' ')}</span>
        </span>
      ))}
    </nav>
  );
}

export default function Layout() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const role = currentUser?.role || 'STUDENT';
  const links = LINKS_BY_ROLE[role] || LINKS_BY_ROLE.STUDENT;
  const initial = (currentUser?.email || 'U').charAt(0).toUpperCase();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-zinc-950 text-zinc-300 flex flex-col">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/15 ring-1 ring-indigo-400/30 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <p className="text-white font-semibold tracking-tight leading-tight">School CRM</p>
              <p className="text-[11px] text-zinc-500">Enterprise console</p>
            </div>
          </div>
        </div>
        <nav className="px-3 space-y-1 flex-1">
          {links.map((l) => {
            const Icon = ICONS[l.label] || LayoutDashboard;
            return (
              <NavLink
                key={l.to + l.label}
                to={l.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white ring-1 ring-white/10'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                {l.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-6 py-3.5">
            <Breadcrumbs path={location.pathname} />
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 transition-colors hover:bg-slate-50"
                  aria-label="Account menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                    {initial}
                  </span>
                  <span className="max-w-[180px] truncate text-sm font-medium text-slate-700">
                    {currentUser?.email}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    {role}
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => { setPwOpen(true); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <KeyRound className="h-4 w-4 text-slate-400" />
                      Change password
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
      {pwOpen && <PasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  );
}

function PasswordModal({ onClose }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    if (next.length < 6) { setMsg('New password must be at least 6 characters.'); return; }
    if (next !== confirm) { setMsg('New passwords do not match.'); return; }
    setBusy(true);
    try {
      await apiFetch('/api/auth/password', {
        method: 'PATCH',
        body: { current_password: current, new_password: next },
      });
      setOk(true);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-zinc-950/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {ok ? (
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Password updated</h2>
            <p className="mt-1 text-sm text-slate-500">Use the new password next time you sign in.</p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Change password</h2>
              <p className="mt-0.5 text-xs text-slate-500">Enter the current password once, then the new one twice.</p>
            </div>
            <input
              type="password"
              placeholder="Current password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <input
              type="password"
              placeholder="New password (min 6 chars)"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {msg && <p className="text-sm text-rose-600">{msg}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 rounded-xl bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
