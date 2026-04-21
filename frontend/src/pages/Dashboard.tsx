import { useEffect, useState } from 'react';
import { Users, Shield, Key, FileText, Scale, Clock, DollarSign, CalendarDays, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import { usersApi } from '../api/users';
import { rolesApi } from '../api/roles';
import { permissionsApi } from '../api/permissions';
import { casesApi } from '../api/cases';

export default function Dashboard() {
  const { user } = useAuth();
  const userType = user?.user_type ?? 'client';
  const isAdmin = userType === 'admin';
  const isClient = userType === 'client';

  const [adminStats, setAdminStats] = useState({ users: 0, roles: 0, permissions: 0 });
  const [caseStats, setCaseStats] = useState({ total: 0, open: 0, urgent: 0, closed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        if (isAdmin) {
          const [usersRes, rolesRes, permsRes] = await Promise.all([
            usersApi.list(1).catch(() => ({ count: 0 })),
            rolesApi.list(1).catch(() => ({ count: 0 })),
            permissionsApi.list(1).catch(() => ({ count: 0 })),
          ]);
          setAdminStats({
            users: usersRes?.count ?? 0,
            roles: rolesRes?.count ?? 0,
            permissions: permsRes?.count ?? 0,
          });
        }
        const cs = await casesApi.stats().catch(() => null);
        if (cs) setCaseStats({ total: cs.total, open: cs.open, urgent: cs.urgent, closed: cs.closed });
      } catch { /* empty */ }
      setLoading(false);
    }
    fetchStats();
  }, [isAdmin]);

  const roleLabel: Record<string, string> = {
    admin: 'Administrador', lawyer: 'Abogado', assistant: 'Asistente Legal', client: 'Cliente',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">
          Bienvenido{user?.first_name ? `, ${user.first_name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-surface-500">
          {roleLabel[userType] ?? userType} — Panel de control LegalFlow
        </p>
      </div>

      {/* Cards de admin: Usuarios / Roles / Permisos */}
      {isAdmin && (
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { title: 'Usuarios', value: adminStats.users, icon: Users, color: 'bg-blue-500', link: '/users' },
            { title: 'Roles', value: adminStats.roles, icon: Shield, color: 'bg-emerald-500', link: '/roles' },
            { title: 'Permisos', value: adminStats.permissions, icon: Key, color: 'bg-amber-500', link: '/permissions' },
          ].map((s) => (
            <Link key={s.title} to={s.link}>
              <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-surface-500">{s.title}</p>
                    <p className="mt-2 text-3xl font-bold text-surface-900">
                      {loading ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-surface-200" /> : s.value}
                    </p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.color} shadow-lg`}>
                    <s.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100">
                  Ver detalle <ArrowUpRight className="h-3 w-3" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Cards de casos — visibles para todos */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: isClient ? 'Mis casos' : 'Total casos', value: caseStats.total, icon: Scale, color: 'bg-primary-500', link: '/cases' },
          { title: 'En proceso', value: caseStats.open, icon: Clock, color: 'bg-amber-500', link: '/cases' },
          { title: 'Urgentes', value: caseStats.urgent, icon: Scale, color: 'bg-red-500', link: '/cases' },
          { title: 'Cerrados', value: caseStats.closed, icon: Scale, color: 'bg-emerald-500', link: '/cases' },
        ].map((s) => (
          <Link key={s.title} to={s.link}>
            <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-500">{s.title}</p>
                  <p className="mt-2 text-3xl font-bold text-surface-900">
                    {loading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-surface-200" /> : s.value}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.color} shadow-lg`}>
                  <s.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100">
                Ver detalle <ArrowUpRight className="h-3 w-3" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Accesos rápidos según rol */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Accesos rápidos</h3>
          <div className="space-y-2">
            {[
              { label: 'Ver mis casos', href: '/cases', icon: Scale, show: true },
              { label: 'Documentos', href: '/documents', icon: FileText, show: true },
              { label: 'Facturación', href: '/billing', icon: DollarSign, show: true },
              { label: 'Control de tiempo', href: '/time-tracking', icon: Clock, show: !isClient },
              { label: 'Calendario', href: '/calendar', icon: CalendarDays, show: !isClient },
              { label: 'Gestión de usuarios', href: '/users', icon: Users, show: isAdmin },
              { label: 'Roles y permisos', href: '/roles', icon: Shield, show: isAdmin },
            ].filter(l => l.show).map((l) => (
              <Link key={l.href} to={l.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-700 transition-colors hover:bg-primary-50 hover:text-primary-700">
                <l.icon className="h-4 w-4 shrink-0" />
                {l.label}
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </Card>

        {/* Panel de servicios solo para admin */}
        {isAdmin ? (
          <Card>
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Microservicios</h3>
            <div className="space-y-3">
              {[
                { name: 'IAM Service', port: 8001 },
                { name: 'Document Service', port: 8002 },
                { name: 'Matter Service', port: 8003 },
                { name: 'Time Tracking', port: 8004 },
                { name: 'Billing Service', port: 8005 },
                { name: 'Calendar Service', port: 8006 },
              ].map((svc) => (
                <div key={svc.name} className="flex items-center justify-between rounded-lg bg-surface-50 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-surface-900">{svc.name}</p>
                    <p className="text-xs text-surface-400">Puerto {svc.port}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-600">Activo</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <h3 className="text-lg font-semibold text-surface-900 mb-4">
              {isClient ? 'Tu información' : 'Resumen del equipo'}
            </h3>
            <div className="space-y-3">
              <div className="rounded-lg bg-surface-50 px-4 py-3">
                <p className="text-xs text-surface-400">Usuario</p>
                <p className="text-sm font-medium text-surface-900">
                  {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                </p>
              </div>
              <div className="rounded-lg bg-surface-50 px-4 py-3">
                <p className="text-xs text-surface-400">Rol</p>
                <p className="text-sm font-medium text-surface-900">{roleLabel[userType]}</p>
              </div>
              <div className="rounded-lg bg-surface-50 px-4 py-3">
                <p className="text-xs text-surface-400">Email</p>
                <p className="text-sm font-medium text-surface-900">{user?.email || '—'}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
