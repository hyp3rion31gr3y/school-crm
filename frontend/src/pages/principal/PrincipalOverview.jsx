import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Briefcase,
  FileText,
  CalendarCheck,
  Banknote,
  Wallet,
  Trash2,
  Plus,
  Inbox,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

export default function PrincipalOverview() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [worksheets, setWorksheets] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch('/api/admin/stats'),
      apiFetch('/api/users'),
      apiFetch('/api/classes/mine'),
      apiFetch('/api/worksheets'),
      apiFetch('/api/payroll'),
    ]).then(([st, us, cls, ws, pay]) => {
      setStats(st);
      setUsers(us);
      setClasses(cls);
      setWorksheets(ws);
      setPayroll((pay || []).slice(0, 20));
    }).catch((e) => setMsg(e.message));
  }, []);

  async function deleteWorksheet(id) {
    setMsg('');
    try {
      await apiFetch(`/api/worksheets/${id}`, { method: 'DELETE' });
      setWorksheets(worksheets.filter((w) => w.id !== id));
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Whole-school snapshot — enrolment, staffing, learning, fees.</p>
        </div>
        <Link
          to="/users"
          className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          Add User
        </Link>
      </div>

      {msg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{msg}</div>
      )}

      {/* Stat cards */}
      {!stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total students"
            value={stats.totalStudents}
            micro="Enrolled learners"
            icon={Users}
            iconWrap="bg-blue-50 text-blue-600 ring-blue-600/10"
          />
          <StatCard
            label="Total staff"
            value={stats.totalStaff}
            micro="Teachers + support"
            icon={Briefcase}
            iconWrap="bg-violet-50 text-violet-600 ring-violet-600/10"
          />
          <StatCard
            label="Worksheets"
            value={stats.totalWorksheets}
            micro="Published resources"
            icon={FileText}
            iconWrap="bg-amber-50 text-amber-600 ring-amber-600/10"
          />
          <StatCard
            label="Attendance today"
            value={stats.attendanceToday}
            micro="Present marks logged"
            icon={CalendarCheck}
            iconWrap="bg-emerald-50 text-emerald-600 ring-emerald-600/10"
          />
          <StatCard
            label="Payroll this month"
            value={stats.payrollThisMonth}
            micro="Disbursed payouts"
            icon={Banknote}
            iconWrap="bg-indigo-50 text-indigo-600 ring-indigo-600/10"
          />
        </div>
      )}

      {/* Fees */}
      {stats?.feesByStatus?.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.feesByStatus.map((f) => (
            <StatCard
              key={f.status}
              label={`Fees ${f.status}`}
              value={`${f.count} / ${f.total}`}
              micro="Count / amount"
              icon={Wallet}
              iconWrap="bg-slate-100 text-slate-600 ring-slate-600/10"
              badge={<StatusBadge status={f.status} />}
            />
          ))}
        </div>
      )}

      {/* Users */}
      <SectionCard
        title="Users"
        count={users.length}
        action={{ label: 'Add User', to: '/users' }}
      >
        {users.length === 0 ? (
          <EmptyState
            title="No users yet"
            hint="Create the first student or staff account to populate the directory."
            actionLabel="Add User"
            to="/users"
          />
        ) : (
          <DataTable head={['Email', 'Role', 'Created']}>
            {users.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-slate-50/80">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{u.email}</td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3 text-sm tabular-nums text-slate-500">
                  {new Date(u.createdAt).toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      {/* Classes */}
      <SectionCard
        title="Classes"
        count={classes.length}
        action={{ label: 'Create Class', to: '/users' }}
      >
        {classes.length === 0 ? (
          <EmptyState
            title="No classes found"
            hint="Set up sections before assigning worksheets and attendance."
            actionLabel="Create Class"
            to="/users"
          />
        ) : (
          <DataTable head={['Name', 'Section', 'Students']}>
            {classes.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-slate-50/80">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-600/10">
                    {c.section}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-slate-500">{c._count?.students ?? '—'}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      {/* Worksheets */}
      <SectionCard title="Worksheets" count={worksheets.length} action={{ label: 'View All', to: '/worksheets' }}>
        {worksheets.length === 0 ? (
          <EmptyState
            title="No worksheets published"
            hint="Upload the first worksheet to get classroom resources flowing."
            actionLabel="Go to Worksheets"
            to="/worksheets"
          />
        ) : (
          <DataTable head={['Title', 'Subject', 'Uploader', 'Actions']}>
            {worksheets.map((w) => (
              <tr key={w.id} className="transition-colors hover:bg-slate-50/80">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{w.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{w.class_subject_id}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{w.uploaded_by?.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteWorksheet(w.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      {/* Payroll */}
      <SectionCard title="Payroll" subtitle="Recent 20 payouts" action={{ label: 'View All', to: '/payroll' }}>
        {payroll.length === 0 ? (
          <EmptyState
            title="No payroll records"
            hint="Payroll entries will appear here once disbursed."
            actionLabel="Go to Payroll"
            to="/payroll"
          />
        ) : (
          <DataTable head={['User', 'Date', 'Amount']}>
            {payroll.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-slate-50/80">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.user_id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-sm tabular-nums text-slate-500">
                  {new Date(p.payment_date).toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold tabular-nums text-slate-900">
                  {Number(p.amount_paid).toFixed(2)}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>
    </div>
  );
}

function StatCard({ label, value, micro, icon: Icon, iconWrap, badge }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ${iconWrap}`}>
          <Icon className="h-5 w-5" />
        </div>
        {badge}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm text-slate-500">{label}</p>
      {micro && <p className="mt-1 text-xs text-slate-400">{micro}</p>}
    </div>
  );
}

function SectionCard({ title, count, subtitle, action, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
          {typeof count === 'number' && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
              {count}
            </span>
          )}
          {subtitle && <span className="text-xs text-slate-400">· {subtitle}</span>}
        </div>
        {action && (
          <Link
            to={action.to}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function DataTable({ head, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50/50">
            {head.map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
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

function EmptyState({ title, hint, actionLabel, to }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Inbox className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p>
      {actionLabel && (
        <Link
          to={to}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = {
    PRINCIPAL: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    TEACHER: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    STUDENT: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    RECEPTION: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    PEON: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  };
  const cls = styles[role] || 'bg-slate-100 text-slate-600 ring-slate-600/10';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = String(status).toUpperCase();
  const cls = s.includes('PAID') || s.includes('COMPLETE')
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    : s.includes('PENDING') || s.includes('DUE')
      ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
      : 'bg-slate-100 text-slate-600 ring-slate-600/10';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
}
