import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  Shield,
  Key,
  FileText,
  Scale,
  Clock,
  DollarSign,
  CalendarDays,
  BarChart3,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const adminNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Casos', href: '/cases', icon: Scale },
  { name: 'Control de Tiempo', href: '/time-tracking', icon: Clock },
  { name: 'Documentos', href: '/documents', icon: FileText },
  { name: 'Facturación', href: '/billing', icon: DollarSign },
  { name: 'Calendario', href: '/calendar', icon: CalendarDays },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Usuarios', href: '/users', icon: Users },
  { name: 'Roles', href: '/roles', icon: Shield },
  { name: 'Permisos', href: '/permissions', icon: Key },
];

const lawyerNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Mis Casos', href: '/cases', icon: Scale },
  { name: 'Control de Tiempo', href: '/time-tracking', icon: Clock },
  { name: 'Documentos', href: '/documents', icon: FileText },
  { name: 'Facturación', href: '/billing', icon: DollarSign },
  { name: 'Calendario', href: '/calendar', icon: CalendarDays },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

const clientNavigation = [
  { name: 'Mi Portal', href: '/client-portal', icon: Building2 },
  { name: 'Mis Casos', href: '/cases', icon: Scale },
  { name: 'Documentos', href: '/documents', icon: FileText },
  { name: 'Facturación', href: '/billing', icon: DollarSign },
];

export default function Sidebar() {
  const { user } = useAuth();

  const navigation =
    user?.user_type === 'admin' ? adminNavigation :
    user?.user_type === 'lawyer' ? lawyerNavigation :
    user?.user_type === 'assistant' ? lawyerNavigation :
    clientNavigation;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-surface-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-surface-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 shadow-sm">
          <Scale className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-surface-900">LegalFlow</h1>
          <p className="text-[10px] font-medium uppercase tracking-wider text-surface-400">Gestión Legal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-surface-200 p-4">
        {user && (
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              {(user.first_name?.[0] || user.username[0]).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-surface-700">
                {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
              </p>
              <p className="text-[10px] text-surface-400 capitalize">{user.user_type}</p>
            </div>
          </div>
        )}
        <p className="text-xs text-surface-400 text-center">LegalFlow v1.0</p>
      </div>
    </aside>
  );
}
