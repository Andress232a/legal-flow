import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleRouteProps {
  children: ReactNode;
  allowed: string[];
}

export default function RoleRoute({ children, allowed }: RoleRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!user || !allowed.includes(user.user_type)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
