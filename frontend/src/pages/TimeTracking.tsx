import { useEffect, useState, useCallback } from 'react';
import {
  Clock, Play, Pause, Square, Trash2, Plus, Search,
  RefreshCw, Timer, Briefcase, CheckCircle, DollarSign,
  X, FileText, Users, Gavel, BookOpen,
  Coffee, Car, Wrench,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { timeTrackingApi } from '../api/timeTracking';
import { casesApi } from '../api/cases';
import type { TimeEntry, Timer as TimerType, TimeStats, Case } from '../types';

// ─── Mappings ─────────────────────────────────────────────────────────────────

const taskConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  research:       { label: 'Investigación',     icon: <Search className="h-4 w-4" />,    color: 'bg-blue-50 text-blue-600' },
  drafting:       { label: 'Redacción',         icon: <FileText className="h-4 w-4" />,  color: 'bg-violet-50 text-violet-600' },
  court:          { label: 'Actuación judicial',icon: <Gavel className="h-4 w-4" />,     color: 'bg-red-50 text-red-600' },
  client_meeting: { label: 'Reunión cliente',   icon: <Users className="h-4 w-4" />,     color: 'bg-emerald-50 text-emerald-600' },
  negotiation:    { label: 'Negociación',       icon: <Briefcase className="h-4 w-4" />, color: 'bg-amber-50 text-amber-600' },
  review:         { label: 'Revisión',          icon: <BookOpen className="h-4 w-4" />,  color: 'bg-teal-50 text-teal-600' },
  admin:          { label: 'Administrativo',    icon: <Coffee className="h-4 w-4" />,    color: 'bg-surface-100 text-surface-500' },
  travel:         { label: 'Desplazamiento',    icon: <Car className="h-4 w-4" />,       color: 'bg-pink-50 text-pink-600' },
  other:          { label: 'Otro',              icon: <Wrench className="h-4 w-4" />,    color: 'bg-surface-100 text-surface-500' },
};

function TaskIcon({ type }: { type: string }) {
  const cfg = taskConfig[type] || taskConfig.other;
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
      {cfg.icon}
    </div>
  );
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatSeconds(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Active Timer Widget ───────────────────────────────────────────────────────

function ActiveTimerWidget({
  timer, onStop, onPause, onResume, onDiscard,
}: {
  timer: TimerType;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const [elapsed, setElapsed] = useState(timer.elapsed_seconds);

  useEffect(() => {
    setElapsed(timer.elapsed_seconds);
    if (timer.status !== 'running') return;
    const interval = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  return (
    <div className="rounded-xl border-2 border-primary-200 bg-primary-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${timer.status === 'running' ? 'bg-primary-600 animate-pulse' : 'bg-surface-400'}`}>
            <Timer className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-600">
              {timer.status === 'running' ? 'Temporizador activo' : 'Temporizador pausado'}
            </p>
            <p className="truncate text-sm font-semibold text-surface-900">
              {timer.case_number || timer.case_id} — {taskConfig[timer.task_type]?.label || timer.task_type}
            </p>
            {timer.description && (
              <p className="truncate text-xs text-surface-500">{timer.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-2xl font-bold text-primary-700">{formatSeconds(elapsed)}</span>
          <div className="flex items-center gap-1">
            {timer.status === 'running' ? (
              <button onClick={onPause} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" title="Pausar">
                <Pause className="h-5 w-5" />
              </button>
            ) : (
              <button onClick={onResume} className="rounded-lg p-2 text-primary-600 hover:bg-primary-100" title="Reanudar">
                <Play className="h-5 w-5" />
              </button>
            )}
            <button onClick={onStop} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" title="Detener y guardar">
              <Square className="h-5 w-5" />
            </button>
            <button onClick={onDiscard} className="rounded-lg p-2 text-red-400 hover:bg-red-50" title="Descartar">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Start Timer Modal ─────────────────────────────────────────────────────────

function CaseSelect({ value, onChange, cases, loading }: {
  value: string; onChange: (caseId: string, caseNumber: string) => void;
  cases: Case[]; loading: boolean;
}) {
  const selectCls = "block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-surface-700">Caso.</label>
      <select
        value={value}
        onChange={e => {
          const selected = cases.find(c => c.id === e.target.value);
          onChange(e.target.value, selected?.case_number ?? '');
        }}
        className={selectCls}
        disabled={loading}
      >
        <option value="">— Seleccionar caso —</option>
        {cases.map(c => (
          <option key={c.id} value={c.id}>
            {c.case_number} — {(c.title?.length ?? 0) > 45 ? c.title.slice(0, 45) + '…' : (c.title ?? '')}
          </option>
        ))}
        {!loading && cases.length === 0 && (
          <option disabled>No hay casos disponibles</option>
        )}
      </select>
    </div>
  );
}

function StartTimerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (t: TimerType) => void }) {
  const [form, setForm] = useState({
    case_id: '', case_number: '', task_type: 'research', description: '', is_billable: true,
  });
  const [cases, setCases] = useState<Case[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    casesApi.list({ page: 1 }).then(r => setCases(Array.isArray(r?.results) ? r.results : [])).catch(() => setCases([])).finally(() => setCasesLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!form.case_id) return setError('Debes seleccionar un caso.');
    setError(''); setSubmitting(true);
    try {
      const timer = await timeTrackingApi.startTimer(form);
      onSuccess(timer);
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || 'Error al iniciar el temporizador.');
    }
    setSubmitting(false);
  };

  const selectCls = "block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

  return (
    <Modal open onClose={onClose} title="Iniciar Temporizador" size="md">
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <CaseSelect
          value={form.case_id}
          onChange={(id, num) => setForm(f => ({ ...f, case_id: id, case_number: num }))}
          cases={cases}
          loading={casesLoading}
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-surface-700">Tipo de tarea.</label>
          <select value={form.task_type} onChange={e => set('task_type', e.target.value)} className={selectCls}>
            {Object.entries(taskConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
        </div>
        <Input label="Descripción." placeholder="¿En qué estás trabajando?"
          value={form.description} onChange={e => set('description', e.target.value)} />
        <label className="flex items-center gap-3 rounded-lg border border-surface-200 p-3 cursor-pointer hover:bg-surface-50">
          <input type="checkbox" checked={form.is_billable} onChange={e => set('is_billable', e.target.checked)}
            className="h-4 w-4 rounded border-surface-300 text-primary-600" />
          <div>
            <p className="text-sm font-medium text-surface-700 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-emerald-500" /> Facturable al cliente.
            </p>
          </div>
        </label>
        <div className="flex justify-end gap-3 border-t border-surface-100 pt-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}>
            <Play className="h-4 w-4" /> Iniciar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Log Entry Modal ───────────────────────────────────────────────────────────

function LogEntryModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    case_id: '', case_number: '', task_type: 'research',
    description: '', date: new Date().toISOString().split('T')[0],
    duration_minutes: 60, is_billable: true, hourly_rate: '',
  });
  const [cases, setCases] = useState<Case[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    casesApi.list({ page: 1 }).then(r => setCases(Array.isArray(r?.results) ? r.results : [])).catch(() => setCases([])).finally(() => setCasesLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!form.case_id) return setError('Debes seleccionar un caso.');
    if (!form.description.trim()) return setError('La descripción es obligatoria.');
    if (form.duration_minutes <= 0) return setError('La duración debe ser mayor a 0.');
    setError(''); setSubmitting(true);
    try {
      await timeTrackingApi.createEntry({
        ...form,
        hourly_rate: form.hourly_rate || undefined,
      });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, unknown> } };
      const msg = err?.response?.data
        ? Object.entries(err.response.data).map(([k, v]) => `${k}: ${v}`).join('\n')
        : 'Error al registrar el tiempo.';
      setError(msg);
    }
    setSubmitting(false);
  };

  const selectCls = "block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

  return (
    <Modal open onClose={onClose} title="Registrar Tiempo Manualmente" size="lg">
      <div className="space-y-4">
        {error && <div className="whitespace-pre-line rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">Caso</p>
          <CaseSelect
            value={form.case_id}
            onChange={(id, num) => setForm(f => ({ ...f, case_id: id, case_number: num }))}
            cases={cases}
            loading={casesLoading}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">Trabajo realizado</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Tipo de tarea.</label>
              <select value={form.task_type} onChange={e => set('task_type', e.target.value)} className={selectCls}>
                {Object.entries(taskConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Descripción.</label>
              <textarea rows={2} placeholder="Describe el trabajo realizado..."
                value={form.description} onChange={e => set('description', e.target.value)}
                className="block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">Tiempo y facturación</p>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Fecha." type="date"
              value={form.date} onChange={e => set('date', e.target.value)} />
            <Input label="Duración en minutos." type="number" min={1} max={1440}
              value={String(form.duration_minutes)} onChange={e => set('duration_minutes', parseInt(e.target.value) || 0)} />
            <Input label="Tarifa por hora en euros." type="number" min={0} placeholder="150.00"
              value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} />
          </div>
          <label className="mt-3 flex items-center gap-3 rounded-lg border border-surface-200 p-3 cursor-pointer hover:bg-surface-50">
            <input type="checkbox" checked={form.is_billable} onChange={e => set('is_billable', e.target.checked)}
              className="h-4 w-4 rounded border-surface-300 text-primary-600" />
            <p className="text-sm font-medium text-surface-700 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-emerald-500" /> Facturable al cliente.
            </p>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-surface-100 pt-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}>
            <Plus className="h-4 w-4" /> Registrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TimeTracking() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<TimeStats | null>(null);
  const [activeTimer, setActiveTimer] = useState<TimerType | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTask, setFilterTask] = useState('');
  const [showStartTimer, setShowStartTimer] = useState(false);
  const [showLogEntry, setShowLogEntry] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      if (filterTask) params.task_type = filterTask;

      const [entriesRes, statsRes] = await Promise.all([
        timeTrackingApi.listEntries(params),
        timeTrackingApi.getStats(),
      ]);
      setEntries(Array.isArray(entriesRes?.results) ? entriesRes.results : []);
      setTotal(entriesRes?.count ?? 0);
      setStats(statsRes ?? null);
      setActiveTimer(statsRes?.active_timer ?? null);
    } catch {
      setEntries([]);
      setStats(null);
      setActiveTimer(null);
    }
    setLoading(false);
  }, [page, search, filterTask]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handlePause = async () => {
    if (!activeTimer) return;
    try {
      const updated = await timeTrackingApi.pauseTimer(activeTimer.id);
      setActiveTimer(updated);
    } catch { /* ignore */ }
  };

  const handleResume = async () => {
    if (!activeTimer) return;
    try {
      const updated = await timeTrackingApi.resumeTimer(activeTimer.id);
      setActiveTimer(updated);
    } catch { /* ignore */ }
  };

  const handleStop = async () => {
    if (!activeTimer) return;
    try {
      await timeTrackingApi.stopTimer(activeTimer.id);
      setActiveTimer(null);
      await loadAll();
    } catch { /* ignore */ }
  };

  const handleDiscard = async () => {
    if (!activeTimer) return;
    if (!window.confirm('¿Descartar el temporizador? No se guardará el tiempo.')) return;
    try {
      await timeTrackingApi.discardTimer(activeTimer.id);
      setActiveTimer(null);
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta entrada de tiempo?')) return;
    try {
      await timeTrackingApi.deleteEntry(id);
      await loadAll();
    } catch { /* ignore */ }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Control de Tiempo</h1>
          <p className="text-sm text-surface-500">Registra y gestiona el tiempo dedicado a cada caso</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={loadAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="secondary" onClick={() => setShowStartTimer(true)} disabled={!!activeTimer}>
            <Timer className="h-4 w-4" /> Iniciar timer
          </Button>
          <Button onClick={() => setShowLogEntry(true)}>
            <Plus className="h-4 w-4" /> Registrar tiempo
          </Button>
        </div>
      </div>

      {/* Timer activo */}
      {activeTimer && (
        <ActiveTimerWidget
          timer={activeTimer}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onDiscard={handleDiscard}
        />
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-surface-500">Total horas</p>
                <p className="text-2xl font-bold text-surface-900">{stats.total_hours}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-surface-500">Horas facturables</p>
                <p className="text-2xl font-bold text-surface-900">{stats.billable_hours}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                <CheckCircle className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-surface-500">Entradas</p>
                <p className="text-2xl font-bold text-surface-900">{stats.total_entries}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Briefcase className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-surface-500">Importe facturable</p>
                <p className="text-2xl font-bold text-surface-900">{(stats.billable_amount ?? 0).toFixed(0)}€</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text" placeholder="Buscar por descripción o caso..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-surface-300 pl-9 pr-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-surface-400" />
              </button>
            )}
          </div>
          <select
            value={filterTask} onChange={e => { setFilterTask(e.target.value); setPage(1); }}
            className="rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(taskConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-surface-400">
            <Clock className="h-12 w-12 mb-3 opacity-40" />
            <p className="font-medium">No hay entradas de tiempo</p>
            <p className="text-sm">Registra tiempo manualmente o usa el temporizador</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-surface-100 bg-surface-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-surface-500">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium text-surface-500">Descripción</th>
                  <th className="px-4 py-3 text-left font-medium text-surface-500">Caso</th>
                  <th className="px-4 py-3 text-left font-medium text-surface-500">Fecha</th>
                  <th className="px-4 py-3 text-right font-medium text-surface-500">Duración</th>
                  <th className="px-4 py-3 text-center font-medium text-surface-500">Facturable</th>
                  <th className="px-4 py-3 text-right font-medium text-surface-500">Importe</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3">
                      <TaskIcon type={entry.task_type} />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate font-medium text-surface-900">{entry.description}</p>
                      {entry.created_from_timer && (
                        <span className="text-xs text-surface-400 flex items-center gap-1">
                          <Timer className="h-3 w-3" /> vía temporizador
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-surface-600">
                        {entry.case_number || entry.case_id.slice(0, 8) + '…'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-600 whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-surface-900">
                      {formatDuration(entry.duration_minutes)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {entry.is_billable
                        ? <Badge variant="success">Sí</Badge>
                        : <Badge variant="default">No</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-surface-700">
                      {entry.billable_amount > 0 ? `${entry.billable_amount}€` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(entry.id)}
                        className="rounded p-1 text-surface-300 hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-surface-100 px-4 py-3">
                <p className="text-sm text-surface-500">{total} entradas en total</p>
                <div className="flex items-center gap-1">
                  <Button variant="secondary" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                    Anterior
                  </Button>
                  <span className="px-3 text-sm text-surface-600">{page} / {totalPages}</span>
                  <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {showStartTimer && (
        <StartTimerModal
          onClose={() => setShowStartTimer(false)}
          onSuccess={t => { setActiveTimer(t); setShowStartTimer(false); }}
        />
      )}
      {showLogEntry && (
        <LogEntryModal
          onClose={() => setShowLogEntry(false)}
          onSuccess={() => { setShowLogEntry(false); loadAll(); }}
        />
      )}
    </div>
  );
}
