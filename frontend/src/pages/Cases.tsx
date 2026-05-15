// Fix vercel deployment
import { useEffect, useState, type ReactNode } from 'react';
import {
  Scale, Plus, Search, RefreshCw, X, AlertTriangle, Clock,
  ChevronRight, Users, Calendar, Activity, Tag,
  CheckCircle, Circle, Gavel, Briefcase, Heart, Building2,
  Hammer, BookOpen, Layers, MoreHorizontal, Trash2, Edit,
  Shield,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { casesApi } from '../api/cases';
import { usersApi } from '../api/users';
import type { Case, CaseParty, CaseDate, CaseActivityLog, CaseStats, User } from '../types';
import { useAuth } from '../context/AuthContext';

// ─── Mappings ─────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; badge: 'default' | 'warning' | 'success' | 'info' | 'danger'; icon: ReactNode }> = {
  open:        { label: 'Abierto',       badge: 'info',    icon: <Circle className="h-3.5 w-3.5" /> },
  in_progress: { label: 'En proceso',    badge: 'warning', icon: <Clock className="h-3.5 w-3.5" /> },
  on_hold:     { label: 'En espera',     badge: 'default', icon: <MoreHorizontal className="h-3.5 w-3.5" /> },
  in_appeal:   { label: 'En apelación',  badge: 'warning', icon: <Gavel className="h-3.5 w-3.5" /> },
  closed:      { label: 'Cerrado',       badge: 'success', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  archived:    { label: 'Archivado',     badge: 'danger',  icon: <Layers className="h-3.5 w-3.5" /> },
};

const typeConfig: Record<string, { label: string; icon: ReactNode; color: string }> = {
  civil:          { label: 'Civil',           icon: <Scale className="h-5 w-5" />,      color: 'bg-blue-50 text-blue-600' },
  criminal:       { label: 'Penal',           icon: <Gavel className="h-5 w-5" />,      color: 'bg-red-50 text-red-600' },
  corporate:      { label: 'Corporativo',     icon: <Building2 className="h-5 w-5" />,  color: 'bg-violet-50 text-violet-600' },
  family:         { label: 'Familia',         icon: <Heart className="h-5 w-5" />,      color: 'bg-pink-50 text-pink-600' },
  labor:          { label: 'Laboral',         icon: <Briefcase className="h-5 w-5" />,  color: 'bg-amber-50 text-amber-600' },
  administrative: { label: 'Administrativo',  icon: <BookOpen className="h-5 w-5" />,   color: 'bg-teal-50 text-teal-600' },
  constitutional: { label: 'Constitucional',  icon: <Shield className="h-5 w-5" />,     color: 'bg-emerald-50 text-emerald-600' },
  other:          { label: 'Otro',            icon: <Hammer className="h-5 w-5" />,     color: 'bg-surface-100 text-surface-500' },
};

const partyRoleConfig: Record<string, string> = {
  client: 'Cliente', opposing_party: 'Parte contraria', lawyer: 'Abogado',
  prosecutor: 'Procurador', witness: 'Testigo', expert: 'Perito',
  judge: 'Juez', other: 'Otro',
};

const dateTypeConfig: Record<string, string> = {
  hearing: 'Audiencia', deadline: 'Plazo procesal', filing: 'Escrito',
  trial: 'Juicio oral', appeal: 'Recurso', notification: 'Notificación',
  meeting: 'Reunión', other: 'Otro',
};

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function CaseTypeIcon({ type }: { type: string }) {
  const cfg = typeConfig[type] || typeConfig.other;
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
      {cfg.icon}
    </div>
  );
}

// ─── Create Case Modal ─────────────────────────────────────────────────────────

function CreateCaseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: '', description: '', case_type: 'civil',
    status: 'open', jurisdiction: '', court: '',
    assigned_lawyer_id: '', client_id: '', opened_at: '',
    is_urgent: false, tags: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lawyers, setLawyers] = useState<User[]>([]);
  const [clients, setClients] = useState<User[]>([]);

  useEffect(() => {
    usersApi.lawyers().then(r => setLawyers(Array.isArray(r) ? r : [])).catch(() => setLawyers([]));
    usersApi.clients().then(r => setClients(Array.isArray(r) ? r : [])).catch(() => setClients([]));
  }, []);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError('El título es obligatorio.');
    if (!form.assigned_lawyer_id) return setError('Debes seleccionar un abogado asignado.');
    if (!form.client_id) return setError('Debes seleccionar un cliente.');
    if (!form.opened_at) return setError('La fecha de apertura es obligatoria.');
    setError(''); setSubmitting(true);
    try {
      await casesApi.create({
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      });
      onSuccess(); onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, unknown> } };
      const msg = err?.response?.data
        ? Object.entries(err.response.data).map(([k, v]) => `${k}: ${v}`).join('\n')
        : 'Error al crear el caso. Verifica los datos.';
      setError(msg);
    }
    setSubmitting(false);
  };

  const selectCls = "block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

  return (
    <Modal open onClose={onClose} title="Crear Nuevo Caso" size="lg">
      <div className="space-y-5">
        {error && <div className="whitespace-pre-line rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {/* Sección 1: Identificación */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">Identificación</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Tipo.</label>
              <select value={form.case_type} onChange={e => set('case_type', e.target.value)} className={selectCls}>
                {Object.entries(typeConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Estado.</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={selectCls}>
                {Object.entries(statusConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Sección 2: Título y descripción */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">Descripción</p>
          <div className="space-y-3">
            <Input label="Título." placeholder="García vs. Constructora — Incumplimiento de contrato"
              value={form.title} onChange={e => set('title', e.target.value)} />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Descripción</label>
              <textarea rows={2} placeholder="Descripción detallada del caso..."
                value={form.description} onChange={e => set('description', e.target.value)}
                className="block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" />
            </div>
          </div>
        </div>

        {/* Sección 3: Jurisdicción */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">Jurisdicción</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Jurisdicción" placeholder="Primera Instancia nº 5 — Madrid"
              value={form.jurisdiction} onChange={e => set('jurisdiction', e.target.value)} />
            <Input label="Tribunal" placeholder="Tribunal Civil de Madrid"
              value={form.court} onChange={e => set('court', e.target.value)} />
          </div>
        </div>

        {/* Sección 4: Personas */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">Personas asignadas</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Abogado asignado.</label>
              <select value={form.assigned_lawyer_id} onChange={e => set('assigned_lawyer_id', e.target.value)} className={selectCls}>
                <option value="">— Seleccionar abogado —</option>
                {lawyers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.username})
                  </option>
                ))}
                {lawyers.length === 0 && (
                  <option disabled>No hay abogados registrados</option>
                )}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Cliente.</label>
              <select value={form.client_id} onChange={e => set('client_id', e.target.value)} className={selectCls}>
                <option value="">— Seleccionar cliente —</option>
                {clients.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.username})
                  </option>
                ))}
                {clients.length === 0 && (
                  <option disabled>No hay clientes registrados</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Sección 5: Extras */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">Opciones adicionales</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha de apertura." type="date"
              value={form.opened_at} onChange={e => set('opened_at', e.target.value)} />
            <Input label="Etiquetas" placeholder="urgente, contrato (coma)"
              value={form.tags} onChange={e => set('tags', e.target.value)} />
          </div>
          <label className="mt-3 flex items-center gap-3 rounded-lg border border-surface-200 p-3 cursor-pointer hover:bg-surface-50">
            <input type="checkbox" checked={form.is_urgent} onChange={e => set('is_urgent', e.target.checked)}
              className="h-4 w-4 rounded border-surface-300 text-primary-600" />
            <p className="text-sm font-medium text-surface-700 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Marcar como urgente
            </p>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-surface-100 pt-4">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}>
            <Plus className="h-4 w-4" /> Crear Caso
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Add Party Modal ───────────────────────────────────────────────────────────

function AddPartyModal({ caseItem, onClose, onSuccess }: { caseItem: Case; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ full_name: '', role: 'client', email: '', phone: '', identification: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.full_name.trim()) return setError('El nombre es obligatorio.');
    setError(''); setSubmitting(true);
    try {
      await casesApi.addParty(caseItem.id, form);
      onSuccess(); onClose();
    } catch { setError('Error al añadir la parte.'); }
    setSubmitting(false);
  };

  return (
    <Modal open onClose={onClose} title={`Añadir parte — ${caseItem.case_number}`}>
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <Input label="Nombre completo." placeholder="Juan Pérez García"
          value={form.full_name} onChange={e => set('full_name', e.target.value)} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-surface-700">Rol.</label>
          <select value={form.role} onChange={e => set('role', e.target.value)}
            className="block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
            {Object.entries(partyRoleConfig).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" type="email" placeholder="juan@email.com"
            value={form.email} onChange={e => set('email', e.target.value)} />
          <Input label="Teléfono" placeholder="+34 600 000 000"
            value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <Input label="Identificación (DNI/NIF)" placeholder="12345678A"
          value={form.identification} onChange={e => set('identification', e.target.value)} />
        <Input label="Notas" placeholder="Información adicional..."
          value={form.notes} onChange={e => set('notes', e.target.value)} />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}><Users className="h-4 w-4" /> Añadir parte</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Add Date Modal ────────────────────────────────────────────────────────────

function AddDateModal({ caseItem, onClose, onSuccess }: { caseItem: Case; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: '', date_type: 'hearing', scheduled_date: '', description: '', is_critical: false, notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError('El título es obligatorio.');
    if (!form.scheduled_date) return setError('La fecha es obligatoria.');
    setError(''); setSubmitting(true);
    try {
      await casesApi.addDate(caseItem.id, form);
      onSuccess(); onClose();
    } catch { setError('Error al añadir la fecha.'); }
    setSubmitting(false);
  };

  return (
    <Modal open onClose={onClose} title={`Añadir fecha — ${caseItem.case_number}`}>
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <Input label="Título." placeholder="Audiencia preliminar"
          value={form.title} onChange={e => set('title', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Tipo.</label>
            <select value={form.date_type} onChange={e => set('date_type', e.target.value)}
              className="block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
              {Object.entries(dateTypeConfig).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <Input label="Fecha y hora." type="datetime-local"
            value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
        </div>
        <Input label="Descripción" placeholder="Detalles adicionales..."
          value={form.description} onChange={e => set('description', e.target.value)} />
        <label className="flex items-center gap-3 rounded-lg border border-surface-200 p-3 cursor-pointer hover:bg-surface-50">
          <input type="checkbox" checked={form.is_critical} onChange={e => set('is_critical', e.target.checked)}
            className="h-4 w-4 rounded border-surface-300 text-red-600" />
          <div>
            <p className="text-sm font-medium text-surface-700 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Fecha crítica
            </p>
            <p className="text-xs text-surface-400">Requiere atención inmediata</p>
          </div>
        </label>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}><Calendar className="h-4 w-4" /> Añadir fecha</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Change Status Modal ───────────────────────────────────────────────────────

function ChangeStatusModal({ caseItem, onClose, onSuccess }: { caseItem: Case; onClose: () => void; onSuccess: () => void }) {
  const [newStatus, setNewStatus] = useState(caseItem.status);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (newStatus === caseItem.status) return setError('Selecciona un estado diferente al actual.');
    setError(''); setSubmitting(true);
    try {
      await casesApi.changeStatus(caseItem.id, newStatus, notes);
      onSuccess(); onClose();
    } catch { setError('Error al cambiar el estado.'); }
    setSubmitting(false);
  };

  return (
    <Modal open onClose={onClose} title={`Cambiar estado — ${caseItem.case_number}`}>
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="flex items-center gap-3 rounded-lg bg-surface-50 p-3">
          <span className="text-xs text-surface-500">Estado actual:</span>
          <Badge variant={statusConfig[caseItem.status]?.badge || 'default'}>
            {statusConfig[caseItem.status]?.label || caseItem.status}
          </Badge>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-surface-700">Nuevo estado.</label>
          <select value={newStatus} onChange={e => setNewStatus(e.target.value as typeof newStatus)}
            className="block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
            {Object.entries(statusConfig).map(([v, c]) => (
              <option key={v} value={v} disabled={v === caseItem.status}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-surface-700">Notas del cambio</label>
          <textarea rows={3} placeholder="Motivo del cambio de estado..."
            value={notes} onChange={e => setNotes(e.target.value)}
            className="block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}>Confirmar cambio</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Case Detail Modal ─────────────────────────────────────────────────────────

function CaseDetailModal({ caseItem, onClose, onRefresh, userType }: { caseItem: Case; onClose: () => void; onRefresh: () => void; userType: string }) {
  const canEdit = userType === 'admin' || userType === 'lawyer';
  const isClient = userType === 'client';
  const [tab, setTab] = useState<'info' | 'parties' | 'dates' | 'activity'>('info');
  const [parties, setParties] = useState<CaseParty[]>([]);
  const [dates, setDates] = useState<CaseDate[]>([]);
  const [activityLogs, setActivityLogs] = useState<CaseActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddParty, setShowAddParty] = useState(false);
  const [showAddDate, setShowAddDate] = useState(false);
  const [showChangeStatus, setShowChangeStatus] = useState(false);
  const [currentCase, setCurrentCase] = useState(caseItem);

  const loadTabData = async (t: typeof tab) => {
    setLoading(true);
    try {
      if (t === 'parties') setParties(await casesApi.listParties(currentCase.id));
      if (t === 'dates') setDates(await casesApi.listDates(currentCase.id));
      if (t === 'activity') setActivityLogs(await casesApi.activityLog(currentCase.id));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadTabData(tab); }, [tab]);

  const handlePartyAdded = async () => {
    const updated = await casesApi.get(currentCase.id);
    setCurrentCase(updated);
    await loadTabData('parties');
    onRefresh();
  };

  const handleDateAdded = async () => {
    const updated = await casesApi.get(currentCase.id);
    setCurrentCase(updated);
    await loadTabData('dates');
    onRefresh();
  };

  const handleStatusChanged = async () => {
    const updated = await casesApi.get(currentCase.id);
    setCurrentCase(updated);
    onRefresh();
  };

  const handleRemoveParty = async (partyId: string) => {
    if (!confirm('¿Confirma eliminar esta parte del caso?')) return;
    try {
      await casesApi.removeParty(currentCase.id, partyId);
      await handlePartyAdded();
    } catch { alert('Error al eliminar la parte.'); }
  };

  const handleCompleteDate = async (dateId: string) => {
    try {
      await casesApi.completeDate(currentCase.id, dateId);
      await handleDateAdded();
    } catch { alert('Error al completar la fecha.'); }
  };

  const st = statusConfig[currentCase.status] || statusConfig.open;
  const tp = typeConfig[currentCase.case_type] || typeConfig.other;

  const tabs = [
    { id: 'info', label: 'Información' },
    { id: 'parties', label: `Partes (${currentCase.parties_count ?? 0})` },
    { id: 'dates', label: `Fechas (${currentCase.upcoming_dates_count ?? 0} próx.)` },
    ...(!isClient ? [{ id: 'activity', label: 'Actividad' }] : []),
  ];

  return (
    <>
      <Modal open onClose={onClose} title={`${currentCase.case_number} — ${currentCase.title}`} size="xl">
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-surface-100 p-1">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${tab === t.id ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* INFO TAB */}
          {tab === 'info' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Tipo', value: <span className="flex items-center gap-1.5 text-sm font-medium">{tp.icon} {tp.label}</span> },
                  { label: 'Estado', value: <Badge variant={st.badge}>{st.label}</Badge> },
                  { label: 'Apertura', value: formatDate(currentCase.opened_at) },
                  { label: 'Cierre', value: currentCase.closed_at ? formatDate(currentCase.closed_at) : '—' },
                  { label: 'Jurisdicción', value: currentCase.jurisdiction || '—' },
                  { label: 'Tribunal', value: currentCase.court || '—' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-surface-50 p-3">
                    <p className="text-xs text-surface-400">{item.label}</p>
                    <div className="mt-1 text-sm font-medium text-surface-800">{item.value}</div>
                  </div>
                ))}
              </div>

              {currentCase.description && (
                <div className="rounded-lg bg-surface-50 p-3">
                  <p className="text-xs text-surface-400">Descripción</p>
                  <p className="mt-1 text-sm text-surface-700 leading-relaxed">{currentCase.description}</p>
                </div>
              )}

              {currentCase.tags?.length > 0 && (
                <div className="rounded-lg bg-surface-50 p-3">
                  <p className="text-xs text-surface-400 mb-2">Etiquetas</p>
                  <div className="flex flex-wrap gap-1">
                    {(currentCase.tags ?? []).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                        <Tag className="h-3 w-3" /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {currentCase.is_urgent && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-800">Caso marcado como URGENTE</p>
                </div>
              )}

              {canEdit && (
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => setShowChangeStatus(true)} size="sm" variant="secondary" className="flex-1">
                    <Edit className="h-4 w-4" /> Cambiar estado
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* PARTIES TAB */}
          {tab === 'parties' && (
            <div className="space-y-3">
              {canEdit && (
                <Button onClick={() => setShowAddParty(true)} size="sm">
                  <Plus className="h-4 w-4" /> Añadir parte
                </Button>
              )}
              {loading ? (
                <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>
              ) : parties.length === 0 ? (
                <p className="py-6 text-center text-sm text-surface-400">No hay partes registradas</p>
              ) : (
                parties.map((party) => (
                  <div key={party.id} className="flex items-start gap-3 rounded-lg border border-surface-200 p-3 hover:bg-surface-50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-sm">
                      {party.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-surface-900">{party.full_name}</p>
                        <Badge variant="default">{partyRoleConfig[party.role] || party.role}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-surface-400">
                        {party.email && <span>{party.email}</span>}
                        {party.phone && <span>{party.phone}</span>}
                        {party.identification && <span>ID: {party.identification}</span>}
                      </div>
                    </div>
                    {canEdit && (
                      <button onClick={() => handleRemoveParty(party.id)}
                        className="shrink-0 rounded-lg p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* DATES TAB */}
          {tab === 'dates' && (
            <div className="space-y-3">
              {canEdit && (
                <Button onClick={() => setShowAddDate(true)} size="sm">
                  <Plus className="h-4 w-4" /> Añadir fecha
                </Button>
              )}
              {loading ? (
                <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>
              ) : dates.length === 0 ? (
                <p className="py-6 text-center text-sm text-surface-400">No hay fechas registradas</p>
              ) : (
                dates.map((d) => (
                  <div key={d.id} className={`flex items-start gap-3 rounded-lg border p-3 ${d.is_completed ? 'border-surface-100 bg-surface-50 opacity-60' : d.is_critical ? 'border-red-200 bg-red-50' : 'border-surface-200 hover:bg-surface-50'}`}>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${d.is_completed ? 'bg-emerald-100 text-emerald-600' : d.is_critical ? 'bg-red-100 text-red-600' : 'bg-surface-100 text-surface-600'}`}>
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-surface-900">{d.title}</p>
                        {d.is_critical && !d.is_completed && <Badge variant="danger">Crítico</Badge>}
                        {d.is_completed && <Badge variant="success">Completado</Badge>}
                        <span className="text-xs text-surface-400">{dateTypeConfig[d.date_type] || d.date_type}</span>
                      </div>
                      <p className="mt-1 text-xs text-surface-500">{formatDateTime(d.scheduled_date)}</p>
                      {d.notes && <p className="mt-1 text-xs text-surface-400 italic">{d.notes}</p>}
                    </div>
                    {canEdit && !d.is_completed && (
                      <button onClick={() => handleCompleteDate(d.id)}
                        className="shrink-0 rounded-lg p-1.5 text-surface-400 hover:bg-emerald-50 hover:text-emerald-600"
                        title="Marcar como completado">
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ACTIVITY TAB */}
          {tab === 'activity' && (
            <div className="space-y-2">
              {loading ? (
                <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>
              ) : activityLogs.length === 0 ? (
                <p className="py-6 text-center text-sm text-surface-400">Sin actividad registrada</p>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border border-surface-100 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-surface-800">{log.activity_type_display}</p>
                        <span className="text-xs text-surface-400">{formatDateTime(log.timestamp)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-surface-500">{log.description}</p>
                      {(log.old_value || log.new_value) && (
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          {log.old_value && <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600">{JSON.stringify(log.old_value)}</span>}
                          {log.old_value && log.new_value && <span>→</span>}
                          {log.new_value && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-600">{JSON.stringify(log.new_value)}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Modal>

      {showAddParty && (
        <AddPartyModal
          caseItem={currentCase}
          onClose={() => setShowAddParty(false)}
          onSuccess={handlePartyAdded}
        />
      )}
      {showAddDate && (
        <AddDateModal
          caseItem={currentCase}
          onClose={() => setShowAddDate(false)}
          onSuccess={handleDateAdded}
        />
      )}
      {showChangeStatus && (
        <ChangeStatusModal
          caseItem={currentCase}
          onClose={() => setShowChangeStatus(false)}
          onSuccess={handleStatusChanged}
        />
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Cases() {
  const { user: authUser } = useAuth();
  const userType = authUser?.user_type ?? 'client';
  const canCreate = userType === 'admin' || userType === 'lawyer';
  const [cases, setCases] = useState<Case[]>([]);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [error, setError] = useState('');

  const fetchData = async (q = '', st = '', tp = '') => {
    setLoading(true);
    setError('');
    try {
      const [casesRes, statsRes] = await Promise.all([
        casesApi.list({ search: q || undefined, status: st || undefined, case_type: tp || undefined }),
        casesApi.stats(),
      ]);
      setCases(Array.isArray(casesRes?.results) ? casesRes.results : []);
      setStats(statsRes && typeof statsRes === 'object' && !Array.isArray(statsRes) ? statsRes : null);
    } catch (err: unknown) {
      setCases([]); setStats(null);
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 403) {
        setError('No tienes permisos para ver los casos. Contacta al administrador para que te asigne el rol correspondiente.');
      } else {
        setError('No se pudo conectar con el Matter Service. Verifica que el servicio está levantado.');
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSearch = (v: string) => { setSearch(v); fetchData(v, filterStatus, filterType); };
  const handleFilterStatus = (v: string) => { setFilterStatus(v); fetchData(search, v, filterType); };
  const handleFilterType = (v: string) => { setFilterType(v); fetchData(search, filterStatus, v); };
  const clearFilters = () => { setFilterStatus(''); setFilterType(''); fetchData(search); };

  const statsItems = stats ? [
    { label: 'Total casos', value: stats.total, icon: Scale, color: 'text-primary-600 bg-primary-50' },
    { label: 'En proceso', value: stats.open, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'Urgentes', value: stats.urgent, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'Cerrados', value: stats.closed, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Casos</h1>
          <p className="text-sm text-surface-500">Gestión del ciclo de vida completo de los casos legales</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Nuevo Caso
          </Button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statsItems.map((s) => (
            <Card key={s.label} className="flex items-center gap-3 !p-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-surface-900">{s.value}</p>
                <p className="text-xs text-surface-400">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Table */}
      <Card padding={false}>
        <div className="flex flex-col gap-3 border-b border-surface-200 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input type="text" placeholder="Buscar por título, expediente, juzgado..." value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-surface-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filterStatus} onChange={e => handleFilterStatus(e.target.value)}
              className="rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none">
              <option value="">Todos los estados</option>
              {Object.entries(statusConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
            <select value={filterType} onChange={e => handleFilterType(e.target.value)}
              className="rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none">
              <option value="">Todos los tipos</option>
              {Object.entries(typeConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
            {(filterStatus || filterType) && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-red-500 hover:bg-red-50">
                <X className="h-3.5 w-3.5" /> Limpiar
              </button>
            )}
            <button onClick={() => fetchData(search, filterStatus, filterType)}
              className="rounded-lg p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-600">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-100" />
            ))}
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Scale className="mb-4 h-12 w-12 text-surface-300" />
            <p className="text-sm text-surface-400">No hay casos</p>
            <p className="mt-1 text-xs text-surface-300">
              {search || filterStatus || filterType ? 'Prueba con otros filtros' : 'Crea tu primer caso'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50">
                  {['Caso', 'Tipo', 'Estado', 'Partes', 'Próx. fecha', 'Apertura', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {cases.map((c) => {
                  const st = statusConfig[c.status] || statusConfig.open;
                  return (
                    <tr key={c.id} className="cursor-pointer transition-colors hover:bg-surface-50"
                      onClick={() => setSelectedCase(c)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CaseTypeIcon type={c.case_type} />
                          <div>
                            <p className="text-sm font-medium text-surface-900 flex items-center gap-1.5">
                              {c.title}
                              {c.is_urgent && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            </p>
                            <p className="text-xs text-surface-400 font-mono">{c.case_number}</p>
                            {c.tags?.length > 0 && (
                              <div className="flex gap-1 mt-0.5">
                                {c.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] rounded-full bg-surface-100 px-1.5 py-0.5 text-surface-500">
                                    <Tag className="h-2.5 w-2.5" />{tag}
                                  </span>
                                ))}
                                {c.tags.length > 2 && <span className="text-[10px] text-surface-400">+{c.tags.length - 2}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-600">
                        {typeConfig[c.case_type]?.label || c.case_type}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={st.badge}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-surface-600">
                          <Users className="h-3 w-3" /> {c.parties_count ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(c.upcoming_dates_count ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            <Calendar className="h-3 w-3" /> {c.upcoming_dates_count}
                          </span>
                        ) : (
                          <span className="text-xs text-surface-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-surface-400">
                          <Clock className="h-3 w-3" />{formatDate(c.opened_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={e => { e.stopPropagation(); setSelectedCase(c); }}
                          className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Type distribution */}
      {stats && stats.by_type && Object.keys(stats.by_type).length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Object.entries(stats.by_type).map(([type, count]) => {
            const cfg = typeConfig[type] || typeConfig.other;
            return (
              <Card key={type} className="flex items-center gap-3 !p-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <div>
                  <p className="text-lg font-bold text-surface-900">{count}</p>
                  <p className="text-xs text-surface-400">{cfg.label}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateCaseModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { fetchData(search, filterStatus, filterType); }}
        />
      )}
      {selectedCase && (
        <CaseDetailModal
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRefresh={() => fetchData(search, filterStatus, filterType)}
          userType={userType}
        />
      )}
    </div>
  );
}
