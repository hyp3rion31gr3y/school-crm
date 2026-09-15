import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await login(email, password);
      const role = data?.user?.role;
      const roleHome =
        role === 'PRINCIPAL'
          ? '/overview'
          : role === 'RECEPTION'
            ? '/users'
            : role === 'TEACHER'
              ? '/attendance'
              : role === 'STUDENT'
                ? '/my-attendance'
                : role === 'PEON'
                  ? '/my-payroll'
                  : '/';
      const from = location.state?.from;
      navigate(from && from !== '/' && from !== '/login' ? from : roleHome, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">School CRM Login</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to continue.</p>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <input
            placeholder="Login ID or email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <input
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            disabled={busy}
            type="submit"
            className="w-full rounded-xl bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy ? 'Logging in…' : 'Login'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <p className="mt-3 text-sm">
          <Link to="/unauthorized" className="text-indigo-600 hover:underline">
            Why am I seeing Unauthorized?
          </Link>
        </p>
      </div>
    </div>
  );
}
