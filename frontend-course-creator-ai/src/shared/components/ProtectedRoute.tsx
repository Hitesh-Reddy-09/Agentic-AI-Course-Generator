import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/shared/lib/store';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = useAppStore((s) => s.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
