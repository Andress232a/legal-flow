import { useEffect, useState } from 'react';
import { Users, Shield, Key, FileText, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import { usersApi } from '../api/users';
import { rolesApi } from '../api/roles';
import { permissionsApi } from '../api/permissions';

interface Stats {
  users: number;
  roles: number;
  permissions: number;
  documents: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ users: 0, roles: 0, permissions: 0, documents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [usersRes, rolesRes, permsRes] = await Promise.all([
          usersApi.list(1).catch(() => ({ count: 0 })),
          rolesApi.list(1).catch(() => ({ count: 0 })),
          permissionsApi.list(1).catch(() => ({ count: 0 })),
        ]);
        setStats({
          users: usersRes.count,
          roles: rolesRes.count,
          permissions: permsRes.count,
          documents: 0,
        });
      } catch { /* stats will remain at 0 */ }
      setLoading(false);
    }
    fetchStats();
  }, []);

  const statCards = [
    { title: 'Usuarios', value: stats.users, icon: Users, color: 'bg-blue-500', link: '/users' },
    { title: 'Roles', value: stats.roles, icon: Shield, color: 'bg-emerald-500', link: '/roles' },
    { title: 'Permisos', value: stats.permissions, icon: Key, color: 'bg-amber-500', link: '/permissions' },
    { title: 'Documentos', value: stats.documents, icon: FileText, color: 'bg-purple-500', link: '/documents' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">
          Bienvenido{user?.first_name ? `, ${user.first_name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-surface-500">
          Panel de control de LegalFlow — resumen general del sistema
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.link}>
            <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-500">{stat.title}</p>
                  <p className="mt-2 text-3xl font-bold text-surface-900">
                    {loading ? (
                      <span className="inline-block h-8 w-16 animate-pulse rounded bg-surface-200" />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color} shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100">
                Ver detalle <ArrowUpRight className="h-3 w-3" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Actividad Reciente</h3>
          <div className="space-y-4">
            {[
              { action: 'Sistema iniciado', time: 'Ahora', color: 'bg-emerald-500' },
              { action: 'Migraciones aplicadas correctamente', time: 'Hace 1 min', color: 'bg-blue-500' },
              { action: 'Servicios IAM y Documents activos', time: 'Hace 2 min', color: 'bg-purple-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${item.color}`} />
                <p className="flex-1 text-sm text-surface-700">{item.action}</p>
                <span className="text-xs text-surface-400">{item.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Microservicios</h3>
          <div className="space-y-3">
            {[
              { name: 'IAM Service', port: 8001, status: 'Activo' },
              { name: 'Document Service', port: 8002, status: 'Activo' },
              { name: 'Redis', port: 6379, status: 'Activo' },
              { name: 'MySQL (IAM)', port: 3307, status: 'Activo' },
              { name: 'MySQL (Documents)', port: 3308, status: 'Activo' },
            ].map((svc) => (
              <div key={svc.name} className="flex items-center justify-between rounded-lg bg-surface-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-surface-900">{svc.name}</p>
                  <p className="text-xs text-surface-400">Puerto {svc.port}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-600">{svc.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
