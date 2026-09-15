import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const ROLE_HOME = {
  PRINCIPAL: '/overview',
  RECEPTION: '/users',
  TEACHER: '/attendance',
  STUDENT: '/my-attendance',
  PEON: '/my-payroll',
};

export default function Dashboard() {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
    );
  }
  const home = ROLE_HOME[currentUser?.role] || '/my-attendance';
  return <Navigate to={home} replace />;
}
