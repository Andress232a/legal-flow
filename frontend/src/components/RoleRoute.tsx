import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleRouteProps {
  children: React.ReactNode;
  allowed: string[];
}

export default function RoleRoute({ children, allowed }: RoleRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user || !allowed.includes(user.user_type)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
