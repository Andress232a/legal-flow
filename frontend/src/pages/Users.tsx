import { useEffect, useState } from 'react';
import { Plus, Search, UserCheck, UserX, Trash2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { usersApi } from '../api/users';
import type { User } from '../types';

const userTypeLabel: Record<string, string> = {
  admin: 'Administrador',
  lawyer: 'Abogado',
  assistant: 'Asistente',
  client: 'Cliente',
};

const userTypeBadge: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  admin: 'info',
  lawyer: 'success',
  assistant: 'warning',
  client: 'default',
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', password_confirm: '',
    first_name: '', last_name: '', user_type: 'lawyer',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async (q = '') => {
    setLoading(true);
    try {
      const res = await usersApi.list(1, q);
      setUsers(res.results);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchUsers(value);
  };

  const handleCreate = async () => {
    setFormError('');
    setSubmitting(true);
    try {
      await usersApi.create(formData);
      setShowCreate(false);
      setFormData({ username: '', email: '', password: '', password_confirm: '', first_name: '', last_name: '', user_type: 'lawyer' });
      fetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, string[]> } };
      const data = error.response?.data;
      if (data) {
        const firstError = Object.values(data).flat()[0];
        setFormError(typeof firstError === 'string' ? firstError : 'Error al crear usuario.');
      } else {
        setFormError('Error al crear usuario.');
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await usersApi.delete(id);
      fetchUsers(search);
    } catch { /* empty */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Usuarios</h1>
          <p className="text-sm text-surface-500">Gestión de usuarios del sistema LegalFlow</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Nuevo Usuario
        </Button>
      </div>

      <Card padding={false}>
        <div className="border-b border-surface-200 p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-surface-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Roles</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-6 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-surface-200" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-surface-400">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-surface-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                          {(u.first_name?.[0] || u.username[0]).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-900">
                            {u.first_name ? `${u.first_name} ${u.last_name}` : u.username}
                          </p>
                          <p className="text-xs text-surface-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={userTypeBadge[u.user_type] || 'default'}>
                        {userTypeLabel[u.user_type] || u.user_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length > 0 ? u.roles.map((r) => (
                          <Badge key={r} variant="default">{r}</Badge>
                        )) : (
                          <span className="text-xs text-surface-400">Sin roles</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <UserCheck className="h-3.5 w-3.5" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                          <UserX className="h-3.5 w-3.5" /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Crear Usuario">
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
            <Input label="Apellido" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
          </div>
          <Input label="Usuario" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
          <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contraseña" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
            <Input label="Confirmar" type="password" value={formData.password_confirm} onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Tipo de usuario</label>
            <select
              value={formData.user_type}
              onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
              className="block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="admin">Administrador</option>
              <option value="lawyer">Abogado</option>
              <option value="assistant">Asistente Legal</option>
              <option value="client">Cliente</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={submitting}>Crear Usuario</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
