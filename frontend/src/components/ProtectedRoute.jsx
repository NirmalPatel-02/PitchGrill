import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { status } = useAuth();

  if (status === 'checking') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--color-text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
