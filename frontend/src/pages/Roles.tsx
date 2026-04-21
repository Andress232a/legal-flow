import { useEffect, useState } from 'react';
import { Plus, Shield, Trash2, Lock, Settings, X, Check } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { rolesApi } from '../api/roles';
import { permissionsApi } from '../api/permissions';
import type { Role, RoleDetail, Permission } from '../types';

const resourceLabels: Record<string, string> = {
  case: 'Casos', document: 'Documentos', invoice: 'Facturas',
  time_entry: 'Tiempo', user: 'Usuarios', role: 'Roles',
  calendar: 'Calendario', report: 'Reportes',
};


const actionLabels: Record<string, string> = {
  create: 'Crear', read: 'Leer', update: 'Actualizar', delete: 'Eliminar',
  download: 'Descargar', assign: 'Asignar', approve: 'Aprobar', export: 'Exportar',
};

function ManagePermissionsModal({
  role,
  onClose,
  onUpdated,
}: {
  role: Role;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<RoleDetail | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [selectedToAdd, setSelectedToAdd] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadDetail = async () => {
    setLoadingDetail(true);
    try {
      const [d, permsRes] = await Promise.all([
        rolesApi.get(role.id),
        permissionsApi.list(1),
      ]);
      setDetail(d);
      setAllPermissions(Array.isArray(permsRes?.results) ? permsRes.results : []);
    } catch {
      setError('No se pudo cargar la información del rol.');
    }
    setLoadingDetail(false);
  };

  useEffect(() => { loadDetail(); }, []);

  const assignedIds = new Set(detail?.permissions.map(p => p.permission) ?? []);
  const available = allPermissions.filter(p => !assignedIds.has(p.id));

  const handleAdd = async () => {
    if (!selectedToAdd) return;
    setSaving(true); setError('');
    try {
      await rolesApi.assignPermission(role.id, selectedToAdd);
      setSelectedToAdd('');
      await loadDetail();
      onUpdated();
    } catch {
      setError('Error al asignar el permiso.');
    }
    setSaving(false);
  };

  const handleRevoke = async (permissionId: string) => {
    setSaving(true); setError('');
    try {
      await rolesApi.revokePermission(role.id, permissionId);
      await loadDetail();
      onUpdated();
    } catch {
      setError('Error al revocar el permiso.');
    }
    setSaving(false);
  };

  const grouped = detail?.permissions.reduce<Record<string, typeof detail.permissions>>(
    (acc, rp) => {
      const perm = allPermissions.find(p => p.id === rp.permission);
      const key = perm?.resource_type ?? 'otro';
      if (!acc[key]) acc[key] = [];
      acc[key].push(rp);
      return acc;
    },
    {}
  ) ?? {};

  return (
    <Modal open onClose={onClose} title={`Permisos: ${role.name}`} size="lg">
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Agregar permiso */}
        {!role.is_system_role && (
          <div className="rounded-lg border border-surface-200 bg-surface-50 p-4">
            <p className="mb-3 text-sm font-semibold text-surface-700">Agregar permiso.</p>
            <div className="flex gap-2">
              <select
                value={selectedToAdd}
                onChange={e => setSelectedToAdd(e.target.value)}
                className="flex-1 rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Selecciona un permiso...</option>
                {available.map(p => (
                  <option key={p.id} value={p.id}>
                    {resourceLabels[p.resource_type] ?? p.resource_type} — {actionLabels[p.action] ?? p.action}
                  </option>
                ))}
              </select>
              <Button onClick={handleAdd} loading={saving} disabled={!selectedToAdd}>
                <Check className="h-4 w-4" /> Agregar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de permisos actuales */}
        {loadingDetail ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-200" />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="py-6 text-center text-sm text-surface-400">
            Este rol no tiene permisos asignados.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([resource, rolePerms]) => (
              <div key={resource}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">
                  {resourceLabels[resource] ?? resource}
                </p>
                <div className="space-y-1">
                  {rolePerms.map(rp => {
                    const perm = allPermissions.find(p => p.id === rp.permission);
                    return (
                      <div
                        key={rp.id}
                        className="flex items-center justify-between rounded-lg border border-surface-100 bg-white px-4 py-2.5"
                      >
                        <div>
                          <span className="text-sm font-medium text-surface-800">
                            {perm ? actionLabels[perm.action] ?? perm.action : rp.id}
                          </span>
                          {perm?.name && (
                            <span className="ml-2 text-xs text-surface-400">{perm.name}</span>
                          )}
                        </div>
                        {!role.is_system_role && (
                          <button
                            onClick={() => handleRevoke(rp.permission)}
                            disabled={saving}
                            className="rounded p-1 text-surface-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [managingRole, setManagingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await rolesApi.list(1);
      setRoles(Array.isArray(res?.results) ? res.results : []);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
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
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => setManagingRole(role)}
                      className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                      title="Gestionar permisos"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    {role.is_system_role ? (
                      <Lock className="h-4 w-4 text-surface-300" />
                    ) : (
                      <button
                        onClick={() => handleDelete(role)}
                        className="rounded-lg p-1.5 text-surface-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {role.description && (
                  <p className="mt-3 text-sm text-surface-500 line-clamp-2">{role.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="info">{role.permissions_count ?? 0} permisos</Badge>
                    {role.is_system_role && <Badge variant="warning">Sistema</Badge>}
                  </div>
                  <button
                    onClick={() => setManagingRole(role)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Ver permisos
                  </button>
                </div>
              </Card>
            ))
        )}
      </div>

      {managingRole && (
        <ManagePermissionsModal
          role={managingRole}
          onClose={() => setManagingRole(null)}
          onUpdated={fetchRoles}
        />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Crear Rol">
        <div className="space-y-4">
          <Input
            label="Nombre del rol."
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Descripción.</label>
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
