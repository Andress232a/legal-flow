import { useEffect, useState } from 'react';
import {
  CalendarDays, Plus, AlertTriangle, CheckCircle, Clock,
  ChevronRight, RefreshCw, MapPin, Scale, Flag, Bell,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { calendarApi } from '../api/calendar';
import { casesApi } from '../api/cases';
import type { CalendarEvent, CalendarStats, Case } from '../types';
import { useAuth } from '../context/AuthContext';

// ─── Mappings ─────────────────────────────────────────────────────────────────

const eventTypeConfig: Record<string, { label: string; color: string }> = {
  hearing:      { label: 'Audiencia',     color: 'bg-violet-50 text-violet-600' },
  deadline:     { label: 'Plazo',         color: 'bg-red-50 text-red-600' },
  filing:       { label: 'Escrito',       color: 'bg-blue-50 text-blue-600' },
  trial:        { label: 'Juicio',        color: 'bg-orange-50 text-orange-600' },
  appeal:       { label: 'Recurso',       color: 'bg-amber-50 text-amber-600' },
  notification: { label: 'Notificación', color: 'bg-teal-50 text-teal-600' },
  meeting:      { label: 'Reunión',       color: 'bg-emerald-50 text-emerald-600' },
  payment:      { label: 'Pago',          color: 'bg-pink-50 text-pink-600' },
  other:        { label: 'Otro',          color: 'bg-surface-100 text-surface-500' },
};

const priorityConfig: Record<string, { label: string; badge: 'default' | 'warning' | 'danger' | 'info' }> = {
  low:      { label: 'Baja',     badge: 'default' },
  medium:   { label: 'Media',    badge: 'info' },
  high:     { label: 'Alta',     badge: 'warning' },
  critical: { label: 'Crítica',  badge: 'danger' },
};

function fmtDT(dt: string) {
  return new Date(dt).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(dt: string, completed: boolean) {
  return !completed && new Date(dt) < new Date();
}

// ─── Create Event Modal ───────────────────────────────────────────────────────

function CreateEventModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'hearing', priority: 'medium',
    start_datetime: '', end_datetime: '', all_day: false,
    location: '', case_id: '', case_number: '', is_legal_deadline: false,
  });
  const [cases, setCases] = useState<Case[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    casesApi.list({}).then(r => setCases(r.results)).catch(() => setCases([]));
  }, []);

  const handleCaseChange = (caseId: string) => {
    const c = cases.find(x => x.id === caseId);
    setForm(f => ({ ...f, case_id: caseId, case_number: c?.case_number || '' }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError('El título es obligatorio.');
    if (!form.start_datetime) return setError('La fecha de inicio es obligatoria.');
    setError(''); setSubmitting(true);
    try {
      await calendarApi.create({
        ...form,
        case_id: form.case_id || undefined,
        end_datetime: form.end_datetime || undefined,
      });
      onSuccess(); onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, unknown> } };
      setError(err?.response?.data ? JSON.stringify(err.response.data) : 'Error al crear el evento.');
    }
    setSubmitting(false);
  };

  const sel = "block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

  return (
    <Modal open onClose={onClose} title="Nuevo Evento" size="lg">
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <Input label="Título." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Tipo de evento.</label>
            <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))} className={sel}>
              {Object.entries(eventTypeConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Prioridad.</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={sel}>
              {Object.entries(priorityConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Fecha y hora inicio." type="datetime-local" value={form.start_datetime}
            onChange={e => setForm(f => ({ ...f, start_datetime: e.target.value }))} required />
          <Input label="Fecha y hora fin." type="datetime-local" value={form.end_datetime}
            onChange={e => setForm(f => ({ ...f, end_datetime: e.target.value }))} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Caso asociado.</label>
            <select value={form.case_id} onChange={e => handleCaseChange(e.target.value)} className={sel}>
              <option value="">Sin caso específico</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.case_number} — {c.title}</option>)}
            </select>
          </div>
          <Input label="Lugar / Sala." value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-surface-700 cursor-pointer">
            <input type="checkbox" checked={form.is_legal_deadline}
              onChange={e => setForm(f => ({ ...f, is_legal_deadline: e.target.checked }))}
              className="h-4 w-4 rounded border-surface-300 text-primary-600" />
            Es plazo procesal legal.
          </label>
          <label className="flex items-center gap-2 text-sm text-surface-700 cursor-pointer">
            <input type="checkbox" checked={form.all_day}
              onChange={e => setForm(f => ({ ...f, all_day: e.target.checked }))}
              className="h-4 w-4 rounded border-surface-300 text-primary-600" />
            Todo el día.
          </label>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-surface-700">Descripción.</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2} className="block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}>Crear Evento</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event, onComplete, onClick }: {
  event: CalendarEvent;
  onComplete: (id: string) => void;
  onClick: (e: CalendarEvent) => void;
}) {
  const typeCfg = eventTypeConfig[event.event_type] || eventTypeConfig.other;
  const prioCfg = priorityConfig[event.priority] || priorityConfig.medium;
  const overdue = isOverdue(event.start_datetime, event.is_completed);

  return (
    <div
      onClick={() => onClick(event)}
      className={`group cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${
        event.is_completed ? 'border-surface-100 bg-surface-50 opacity-60' :
        overdue ? 'border-red-200 bg-red-50' :
        event.priority === 'critical' ? 'border-orange-200 bg-orange-50' :
        'border-surface-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${typeCfg.color}`}>
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-semibold truncate ${event.is_completed ? 'line-through text-surface-400' : 'text-surface-900'}`}>
                {event.title}
              </p>
              {event.is_legal_deadline && (
                <Scale className="h-3.5 w-3.5 text-red-500 shrink-0" title="Plazo procesal" />
              )}
              {event.priority === 'critical' && (
                <Flag className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 flex-wrap">
              <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-surface-500'}`}>
                {overdue && '⚠ '}
                {fmtDT(event.start_datetime)}
              </span>
              {event.case_number && (
                <span className="text-xs text-surface-400">{event.case_number}</span>
              )}
              {event.location && (
                <span className="flex items-center gap-1 text-xs text-surface-400">
                  <MapPin className="h-3 w-3" />{event.location}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={prioCfg.badge}>{prioCfg.label}</Badge>
          {!event.is_completed && (
            <button
              onClick={e => { e.stopPropagation(); onComplete(event.id); }}
              className="hidden group-hover:flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
            >
              <CheckCircle className="h-3 w-3" /> Completar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Event Detail Modal ───────────────────────────────────────────────────────

function EventDetailModal({ event, onClose, onUpdated }: {
  event: CalendarEvent; onClose: () => void; onUpdated: () => void;
}) {
  const { user: authUser } = useAuth();
  const canEdit = authUser?.user_type === 'admin' || authUser?.user_type === 'lawyer';
  const typeCfg = eventTypeConfig[event.event_type] || eventTypeConfig.other;
  const prioCfg = priorityConfig[event.priority] || priorityConfig.medium;

  const handleComplete = async () => {
    try { await calendarApi.complete(event.id); onUpdated(); onClose(); } catch { /* empty */ }
  };

  return (
    <Modal open onClose={onClose} title={event.title}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${typeCfg.color}`}>
            {typeCfg.label}
          </span>
          <Badge variant={prioCfg.badge}>{prioCfg.label}</Badge>
          {event.is_legal_deadline && <Badge variant="danger"><Scale className="h-3 w-3 mr-1" />Plazo procesal</Badge>}
          {event.is_completed && <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Completado</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg bg-surface-50 p-4 text-sm">
          <div>
            <p className="text-xs text-surface-400">Inicio</p>
            <p className="font-medium">{fmtDT(event.start_datetime)}</p>
          </div>
          {event.end_datetime && (
            <div>
              <p className="text-xs text-surface-400">Fin</p>
              <p className="font-medium">{fmtDT(event.end_datetime)}</p>
            </div>
          )}
          {event.location && (
            <div className="col-span-2">
              <p className="text-xs text-surface-400">Lugar</p>
              <p className="font-medium flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</p>
            </div>
          )}
          {event.case_number && (
            <div>
              <p className="text-xs text-surface-400">Expediente</p>
              <p className="font-medium">{event.case_number}</p>
            </div>
          )}
          {event.is_completed && event.completed_at && (
            <div>
              <p className="text-xs text-surface-400">Completado el</p>
              <p className="font-medium">{fmtDate(event.completed_at)}</p>
            </div>
          )}
        </div>

        {event.description && (
          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase mb-1">Descripción</p>
            <p className="text-sm text-surface-700">{event.description}</p>
          </div>
        )}

        <div className="flex justify-between pt-2">
          {canEdit && !event.is_completed && (
            <Button onClick={handleComplete}>
              <CheckCircle className="h-4 w-4" /> Marcar completado
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} className="ml-auto">Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Calendar() {
  const { user: authUser } = useAuth();
  const canCreate = authUser?.user_type === 'admin' || authUser?.user_type === 'lawyer' || authUser?.user_type === 'assistant';

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCompleted, setFilterCompleted] = useState('false');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchData = async (tp = '', comp = 'false') => {
    setLoading(true); setError('');
    try {
      const params: Record<string, unknown> = {};
      if (tp) params.event_type = tp;
      if (comp !== '') params.is_completed = comp === 'true';
      const [evRes, upRes, statsRes] = await Promise.all([
        calendarApi.list(params),
        calendarApi.upcoming(),
        calendarApi.stats(),
      ]);
      setEvents(evRes.results);
      setUpcoming(upRes);
      setStats(statsRes);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err?.response?.status === 403) {
        setError('No tienes permisos para ver el calendario.');
      } else {
        setError('No se pudo conectar con el Calendar Service. Verifica que el servicio está levantado.');
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleComplete = async (id: string) => {
    try {
      await calendarApi.complete(id);
      fetchData(filterType, filterCompleted);
    } catch { /* empty */ }
  };

  const statsItems = stats ? [
    { label: 'Total eventos', value: stats.total, color: 'text-primary-600 bg-primary-50', icon: CalendarDays },
    { label: 'Próximos (7d)', value: stats.upcoming, color: 'text-amber-600 bg-amber-50', icon: Clock },
    { label: 'Vencidos', value: stats.overdue, color: 'text-red-600 bg-red-50', icon: AlertTriangle },
    { label: 'Completados', value: stats.completed, color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Calendario</h1>
          <p className="text-sm text-surface-500">Plazos procesales, audiencias y eventos del despacho</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Nuevo Evento
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statsItems.map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-surface-900">{s.value}</p>
                    <p className="text-xs text-surface-500">{s.label}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próximos 7 días */}
        <div className="lg:col-span-1">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-semibold text-surface-800">Próximos 7 días</p>
              <span className="ml-auto text-xs text-surface-400">{upcoming.length} eventos</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-xs text-surface-400 text-center py-4">Sin eventos próximos</p>
            ) : (
              <div className="space-y-2">
                {upcoming.slice(0, 6).map(ev => {
                  const typeCfg = eventTypeConfig[ev.event_type] || eventTypeConfig.other;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="flex items-center gap-3 rounded-lg p-2 cursor-pointer hover:bg-surface-50 transition-colors"
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${typeCfg.color}`}>
                        <CalendarDays className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-surface-800 truncate">{ev.title}</p>
                        <p className="text-xs text-surface-400">{fmtDT(ev.start_datetime)}</p>
                      </div>
                      {ev.is_legal_deadline && <Scale className="h-3 w-3 text-red-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Plazos críticos */}
          {stats && (stats.overdue > 0 || stats.critical > 0) && (
            <Card className="mt-4 border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-sm font-semibold text-red-800">Requieren atención</p>
              </div>
              <div className="space-y-1 text-sm text-red-700">
                {stats.overdue > 0 && <p>{stats.overdue} evento(s) vencido(s) sin completar</p>}
                {stats.critical > 0 && <p>{stats.critical} evento(s) de prioridad crítica</p>}
                {stats.legal_deadlines > 0 && <p>{stats.legal_deadlines} plazo(s) procesal(es)</p>}
              </div>
            </Card>
          )}
        </div>

        {/* Lista de eventos */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="flex flex-wrap items-center gap-3 border-b border-surface-200 p-4">
              <select
                value={filterType}
                onChange={e => { setFilterType(e.target.value); fetchData(e.target.value, filterCompleted); }}
                className="rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(eventTypeConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
              <select
                value={filterCompleted}
                onChange={e => { setFilterCompleted(e.target.value); fetchData(filterType, e.target.value); }}
                className="rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="false">Pendientes</option>
                <option value="true">Completados</option>
                <option value="">Todos</option>
              </select>
              <button onClick={() => { setFilterType(''); setFilterCompleted('false'); fetchData(); }}
                className="rounded-lg border border-surface-300 p-2 text-surface-500 hover:bg-surface-50">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-200" />
                ))
              ) : events.length === 0 ? (
                <div className="py-12 text-center text-sm text-surface-400">
                  <CalendarDays className="mx-auto h-10 w-10 text-surface-200 mb-3" />
                  No hay eventos
                </div>
              ) : (
                events.map(ev => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onComplete={handleComplete}
                    onClick={setSelectedEvent}
                  />
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => fetchData(filterType, filterCompleted)}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdated={() => { fetchData(filterType, filterCompleted); setSelectedEvent(null); }}
        />
      )}
    </div>
  );
}
