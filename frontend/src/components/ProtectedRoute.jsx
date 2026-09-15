import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { currentUser, loading, token } = useAuth();
  const location = useLocation();

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (!token || !currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
