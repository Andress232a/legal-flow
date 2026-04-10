import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Badge from './ui/Badge';

const userTypeLabels: Record<string, string> = {
  admin: 'Administrador',
  lawyer: 'Abogado',
  assistant: 'Asistente Legal',
  client: 'Cliente',
};

const userTypeBadge: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  admin: 'info',
  lawyer: 'success',
  assistant: 'warning',
  client: 'default',
};

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-200 bg-white/80 px-6 backdrop-blur-md">
      <div />
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100">
              <UserIcon className="h-4 w-4 text-primary-600" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-surface-900">
                {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
              </p>
              <Badge variant={userTypeBadge[user.user_type] || 'default'}>
                {userTypeLabels[user.user_type] || user.user_type}
              </Badge>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
