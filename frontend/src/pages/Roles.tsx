import { useEffect, useState } from 'react';
import { Plus, Shield, Trash2, Lock } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { rolesApi } from '../api/roles';
import type { Role } from '../types';

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await rolesApi.list(1);
      setRoles(res.results);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await rolesApi.create(formData);
      setShowCreate(false);
      setFormData({ name: '', description: '' });
      fetchRoles();
    } catch { /* empty */ }
    setSubmitting(false);
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system_role) return alert('No se pueden eliminar roles de sistema.');
    if (!confirm(`¿Eliminar el rol "${role.name}"?`)) return;
    try {
      await rolesApi.delete(role.id);
      fetchRoles();
    } catch { /* empty */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Roles</h1>
          <p className="text-sm text-surface-500">Gestión de roles y permisos del sistema</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Nuevo Rol
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <div className="space-y-3">
                <div className="h-5 w-32 animate-pulse rounded bg-surface-200" />
                <div className="h-4 w-full animate-pulse rounded bg-surface-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-surface-200" />
              </div>
            </Card>
          ))
        ) : roles.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-surface-400">
            No hay roles registrados
          </div>
        ) : (
          roles.map((role) => (
            <Card key={role.id} className="group relative transition-all duration-200 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <Shield className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900">{role.name}</h3>
                    {role.parent_name && (
                      <p className="text-xs text-surface-400">Hereda de: {role.parent_name}</p>
                    )}
                  </div>
                </div>
                {role.is_system_role ? (
                  <Lock className="h-4 w-4 text-surface-300" />
                ) : (
                  <button
                    onClick={() => handleDelete(role)}
                    className="rounded-lg p-1.5 text-surface-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {role.description && (
                <p className="mt-3 text-sm text-surface-500 line-clamp-2">{role.description}</p>
              )}
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="info">{role.permissions_count} permisos</Badge>
                {role.is_system_role && <Badge variant="warning">Sistema</Badge>}
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Crear Rol">
        <div className="space-y-4">
          <Input label="Nombre del Rol" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={submitting}>Crear Rol</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
