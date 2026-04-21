import { useEffect, useState } from 'react';
import { Key, Filter } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { permissionsApi } from '../api/permissions';
import type { Permission } from '../types';

const resourceColors: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'default'> = {
  case: 'info',
  document: 'success',
  invoice: 'warning',
  time_entry: 'default',
  user: 'danger',
  role: 'danger',
  report: 'info',
  calendar: 'warning',
};

const resourceLabels: Record<string, string> = {
  case: 'Caso',
  document: 'Documento',
  invoice: 'Factura',
  time_entry: 'Tiempo',
  user: 'Usuario',
  role: 'Rol',
  report: 'Reporte',
  calendar: 'Calendario',
};

export default function Permissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const res = await permissionsApi.list(1, filter);
        setPermissions(Array.isArray(res?.results) ? res.results : []);
      } catch { /* empty */ }
      setLoading(false);
    }
    fetch();
  }, [filter]);

  const resourceTypes = ['', 'case', 'document', 'invoice', 'time_entry', 'user', 'role', 'report'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Permisos</h1>
        <p className="text-sm text-surface-500">Permisos granulares del sistema LegalFlow</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-surface-400" />
        {resourceTypes.map((rt) => (
          <button
            key={rt || 'all'}
            onClick={() => setFilter(rt)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              filter === rt
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-surface-600 border border-surface-200 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            {rt ? (resourceLabels[rt] || rt) : 'Todos'}
          </button>
        ))}
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Código</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Recurso</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-6 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-surface-200" />
                    </td>
                  </tr>
                ))
              ) : permissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-surface-400">
                    No hay permisos registrados
                  </td>
                </tr>
              ) : (
                permissions.map((perm) => (
                  <tr key={perm.id} className="transition-colors hover:bg-surface-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-surface-400" />
                        <code className="rounded bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-700">
                          {perm.codename}
                        </code>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-700">{perm.name}</td>
                    <td className="px-6 py-4">
                      <Badge variant={resourceColors[perm.resource_type] || 'default'}>
                        {resourceLabels[perm.resource_type] || perm.resource_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm capitalize text-surface-600">{perm.action}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
