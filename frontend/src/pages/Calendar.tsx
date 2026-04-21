import React, { useEffect, useState } from 'react';
import {
  CalendarDays, Plus, AlertTriangle, CheckCircle, Clock,
  ChevronRight, RefreshCw, MapPin, Scale, Flag, Bell,
  Briefcase, Users, FileText, Tag, Building2, Gavel, ChevronDown, ChevronUp,
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
    casesApi.list({}).then(r => setCases(Array.isArray(r?.results) ? r.results : [])).catch(() => setCases([]));
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

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-surface-400 mb-0.5">{label}</p>
      <div className="text-sm font-medium text-surface-800">{children}</div>
    </div>
  );
}

const caseStatusConfig: Record<string, { label: string; color: string }> = {
  open:        { label: 'Abierto',      color: 'bg-emerald-50 text-emerald-700' },
  in_progress: { label: 'En proceso',   color: 'bg-blue-50 text-blue-700' },
  on_hold:     { label: 'En espera',    color: 'bg-amber-50 text-amber-700' },
  in_appeal:   { label: 'En apelación', color: 'bg-purple-50 text-purple-700' },
  closed:      { label: 'Cerrado',      color: 'bg-surface-100 text-surface-500' },
  archived:    { label: 'Archivado',    color: 'bg-surface-100 text-surface-400' },
};

const caseTypeConfig: Record<string, { label: string; color: string }> = {
  civil:           { label: 'Civil',          color: 'bg-blue-50 text-blue-700' },
  criminal:        { label: 'Penal',          color: 'bg-red-50 text-red-700' },
  corporate:       { label: 'Corporativo',    color: 'bg-indigo-50 text-indigo-700' },
  family:          { label: 'Familia',        color: 'bg-pink-50 text-pink-700' },
  labor:           { label: 'Laboral',        color: 'bg-orange-50 text-orange-700' },
  administrative:  { label: 'Administrativo', color: 'bg-teal-50 text-teal-700' },
  constitutional:  { label: 'Constitucional', color: 'bg-violet-50 text-violet-700' },
  other:           { label: 'Otro',           color: 'bg-surface-100 text-surface-500' },
};

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3.5 w-3.5 text-surface-400" />
      <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide">{title}</p>
    </div>
  );
}

function EventDetailModal({ event, onClose, onUpdated }: {
  event: CalendarEvent; onClose: () => void; onUpdated: () => void;
}) {
  const { user: authUser } = useAuth();
  const canEdit = authUser?.user_type === 'admin' || authUser?.user_type === 'lawyer';
  const typeCfg = eventTypeConfig[event.event_type] || eventTypeConfig.other;
  const prioCfg = priorityConfig[event.priority] || priorityConfig.medium;
  const overdue = isOverdue(event.start_datetime, event.is_completed);

  const [caseDetail, setCaseDetail] = useState<Case | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [showCase, setShowCase] = useState(true);

  useEffect(() => {
    if (!event.case_id) return;
    setCaseLoading(true);
    casesApi.get(event.case_id)
      .then(c => setCaseDetail(c))
      .catch(() => setCaseDetail(null))
      .finally(() => setCaseLoading(false));
  }, [event.case_id]);

  const handleComplete = async () => {
    try { await calendarApi.complete(event.id); onUpdated(); onClose(); } catch { /* empty */ }
  };

  const caseSt = caseDetail ? (caseStatusConfig[caseDetail.status] || { label: caseDetail.status, color: 'bg-surface-100 text-surface-500' }) : null;
  const caseTy = caseDetail ? (caseTypeConfig[caseDetail.case_type] || { label: caseDetail.case_type, color: 'bg-surface-100 text-surface-500' }) : null;

  return (
    <Modal open onClose={onClose} title={event.title} size="lg">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

        {/* Badges de estado del evento */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${typeCfg.color}`}>
            {typeCfg.label}
          </span>
          <Badge variant={prioCfg.badge}>{prioCfg.label}</Badge>
          {event.is_legal_deadline && (
            <Badge variant="danger"><Scale className="h-3 w-3 mr-1 inline" />Plazo procesal</Badge>
          )}
          {event.is_completed && (
            <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1 inline" />Completado</Badge>
          )}
          {overdue && !event.is_completed && (
            <Badge variant="danger"><AlertTriangle className="h-3 w-3 mr-1 inline" />Vencido</Badge>
          )}
          {event.all_day && <Badge variant="default">Todo el día</Badge>}
        </div>

        {/* Fechas y lugar */}
        <div className="rounded-xl border border-surface-100 bg-surface-50 p-4">
          <SectionHeader icon={CalendarDays} title="Detalles del evento" />
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Inicio">
              <span className={overdue && !event.is_completed ? 'text-red-600' : ''}>
                {fmtDT(event.start_datetime)}
              </span>
            </InfoRow>
            <InfoRow label="Fin">
              {event.end_datetime ? fmtDT(event.end_datetime) : <span className="text-surface-400 font-normal">—</span>}
            </InfoRow>
            {event.location && (
              <InfoRow label="Lugar">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-surface-400" />{event.location}
                </span>
              </InfoRow>
            )}
            {event.is_completed && event.completed_at && (
              <InfoRow label="Completado el">{fmtDate(event.completed_at)}</InfoRow>
            )}
            {event.description && (
              <div className="col-span-2">
                <InfoRow label="Descripción">
                  <span className="font-normal leading-relaxed">{event.description}</span>
                </InfoRow>
              </div>
            )}
          </div>
        </div>

        {/* Panel del caso */}
        {event.case_id && (
          <div className="rounded-xl border border-primary-100 bg-primary-50/30">
            {/* Header colapsable */}
            <button
              onClick={() => setShowCase(v => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary-500" />
                <span className="text-sm font-semibold text-primary-700">
                  Caso: {event.case_number || '—'}
                </span>
                {caseDetail?.is_urgent && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">URGENTE</span>
                )}
              </div>
              {showCase ? <ChevronUp className="h-4 w-4 text-primary-400" /> : <ChevronDown className="h-4 w-4 text-primary-400" />}
            </button>

            {showCase && (
              <div className="border-t border-primary-100 px-4 pb-4 pt-3 space-y-4">
                {caseLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-surface-400">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-400 border-t-transparent" />
                    Cargando información del caso...
                  </div>
                ) : caseDetail ? (
                  <>
                    {/* Título y descripción del caso */}
                    <div>
                      <p className="text-base font-bold text-surface-900">{caseDetail.title}</p>
                      {caseDetail.description && (
                        <p className="mt-1 text-sm text-surface-600 leading-relaxed">{caseDetail.description}</p>
                      )}
                    </div>

                    {/* Estado, tipo, urgencia */}
                    <div className="flex flex-wrap gap-2">
                      {caseSt && (
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${caseSt.color}`}>{caseSt.label}</span>
                      )}
                      {caseTy && (
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${caseTy.color}`}>{caseTy.label}</span>
                      )}
                      {caseDetail.tags?.map((t: string) => (
                        <span key={t} className="flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
                          <Tag className="h-2.5 w-2.5" />{t}
                        </span>
                      ))}
                    </div>

                    {/* Tribunal y jurisdicción */}
                    <div className="grid grid-cols-2 gap-3">
                      {caseDetail.jurisdiction && (
                        <InfoRow label="Jurisdicción">
                          <span className="flex items-center gap-1 font-normal">
                            <Gavel className="h-3.5 w-3.5 text-surface-400" />{caseDetail.jurisdiction}
                          </span>
                        </InfoRow>
                      )}
                      {caseDetail.court && (
                        <InfoRow label="Tribunal">
                          <span className="flex items-center gap-1 font-normal">
                            <Building2 className="h-3.5 w-3.5 text-surface-400" />{caseDetail.court}
                          </span>
                        </InfoRow>
                      )}
                      <InfoRow label="Apertura">
                        <span className="font-normal">{caseDetail.opened_at ? new Date(caseDetail.opened_at).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' }) : '—'}</span>
                      </InfoRow>
                      {caseDetail.closed_at && (
                        <InfoRow label="Cierre">
                          <span className="font-normal">{new Date(caseDetail.closed_at).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' })}</span>
                        </InfoRow>
                      )}
                    </div>

                    {/* Notas internas */}
                    {caseDetail.notes && (
                      <div>
                        <SectionHeader icon={FileText} title="Notas internas" />
                        <p className="rounded-lg border border-surface-100 bg-white px-3 py-2.5 text-sm text-surface-700 leading-relaxed">
                          {caseDetail.notes}
                        </p>
                      </div>
                    )}

                    {/* Partes del caso */}
                    {caseDetail.parties && caseDetail.parties.length > 0 && (
                      <div>
                        <SectionHeader icon={Users} title={`Partes (${caseDetail.parties.length})`} />
                        <div className="space-y-2">
                          {caseDetail.parties.map((p: { id: string; full_name: string; role: string; role_display?: string; email?: string; phone?: string; identification?: string }) => (
                            <div key={p.id} className="flex items-start gap-3 rounded-lg border border-surface-100 bg-white px-3 py-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-100 text-xs font-bold text-surface-500">
                                {p.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-surface-800">{p.full_name}</p>
                                <div className="flex flex-wrap gap-2 mt-0.5">
                                  <span className="text-xs text-surface-500">{p.role_display || p.role}</span>
                                  {p.identification && <span className="text-xs text-surface-400">ID: {p.identification}</span>}
                                  {p.email && <span className="text-xs text-surface-400">{p.email}</span>}
                                  {p.phone && <span className="text-xs text-surface-400">{p.phone}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Otras fechas del caso */}
                    {caseDetail.dates && caseDetail.dates.length > 0 && (
                      <div>
                        <SectionHeader icon={CalendarDays} title={`Fechas del caso (${caseDetail.dates.length})`} />
                        <div className="space-y-1.5">
                          {caseDetail.dates.map((d: { id: string; title: string; date_type: string; date_type_display?: string; scheduled_date: string; is_critical: boolean; is_completed: boolean }) => {
                            const cfg = eventTypeConfig[d.date_type] || eventTypeConfig.other;
                            const isThis = d.id === event.case_date_id;
                            return (
                              <div key={d.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isThis ? 'border border-primary-200 bg-primary-50' : 'border border-surface-100 bg-white'}`}>
                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                                  {d.date_type_display || d.date_type}
                                </span>
                                <span className={`flex-1 font-medium ${d.is_completed ? 'line-through text-surface-400' : 'text-surface-700'}`}>
                                  {d.title}
                                </span>
                                <span className="text-xs text-surface-400 shrink-0">
                                  {new Date(d.scheduled_date).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' })}
                                </span>
                                {d.is_critical && <Flag className="h-3 w-3 text-orange-400 shrink-0" />}
                                {d.is_completed && <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />}
                                {isThis && <span className="text-[10px] font-semibold text-primary-600 shrink-0">← este evento</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-surface-400 py-2">No se pudo cargar la información del caso.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between border-t border-surface-100 pt-3 text-xs text-surface-400">
          <span>Creado: {fmtDT(event.created_at)}</span>
          {event.reminders_count !== undefined && event.reminders_count > 0 && (
            <span className="flex items-center gap-1">
              <Bell className="h-3 w-3" />{event.reminders_count} recordatorio(s)
            </span>
          )}
        </div>

        {/* Acciones */}
        <div className="flex justify-between pt-1">
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

// ─── Monthly Grid ─────────────────────────────────────────────────────────────

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function MonthGrid({ year, month, events, onEventClick }: {
  year: number; month: number;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Agrupa eventos por día del mes
  const byDay: Record<number, CalendarEvent[]> = {};
  events.forEach(ev => {
    const d = new Date(ev.start_datetime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(ev);
    }
  });

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad al múltiplo de 7
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Cabecera días */}
      <div className="grid grid-cols-7 border-b border-surface-200">
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-surface-500">{d}</div>
        ))}
      </div>
      {/* Celdas */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const isToday = day !== null &&
            today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          const dayEvents = day ? (byDay[day] ?? []) : [];
          return (
            <div
              key={idx}
              className={`min-h-[22.5] border-b border-r border-surface-100 p-1 ${
                day === null ? 'bg-surface-50' : 'bg-white'
              }`}
            >
              {day !== null && (
                <>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1 ${
                    isToday ? 'bg-primary-600 text-white' : 'text-surface-600'
                  }`}>{day}</span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => {
                      const cfg = eventTypeConfig[ev.event_type] || eventTypeConfig.other;
                      const overdue = isOverdue(ev.start_datetime, ev.is_completed);
                      return (
                        <button
                          key={ev.id}
                          onClick={() => onEventClick(ev)}
                          title={`${ev.title}${ev.case_number ? ` — ${ev.case_number}` : ''}`}
                          className={`w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium transition-opacity hover:opacity-80 ${
                            ev.is_completed ? 'bg-surface-100 text-surface-400 line-through' :
                            overdue ? 'bg-red-100 text-red-700' :
                            ev.priority === 'critical' ? 'bg-orange-100 text-orange-700' :
                            cfg.color
                          }`}
                        >
                          {ev.title}
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] text-surface-400 pl-1">+{dayEvents.length - 3} más</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Calendar() {
  const { user: authUser } = useAuth();
  const canCreate = authUser?.user_type === 'admin' || authUser?.user_type === 'lawyer' || authUser?.user_type === 'assistant';

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [view, setView] = useState<'month' | 'list'>('month');

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchData = async (tp = '') => {
    setLoading(true); setError('');
    try {
      const params: Record<string, unknown> = {};
      if (tp) params.event_type = tp;
      const [evRes, upRes, statsRes] = await Promise.all([
        calendarApi.list(params),
        calendarApi.upcoming(),
        calendarApi.stats(),
      ]);
      setEvents(Array.isArray(evRes?.results) ? evRes.results : []);
      setUpcoming(Array.isArray(upRes) ? upRes : []);
      setStats(statsRes && typeof statsRes === 'object' && !Array.isArray(statsRes) ? statsRes : null);
    } catch (e: unknown) {
      setEvents([]); setUpcoming([]); setStats(null);
      const err = e as { response?: { status?: number } };
      if (err?.response?.status === 403) {
        setError('No tienes permisos para ver el calendario.');
      } else {
        setError('No se pudo conectar con el Calendar Service.');
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleComplete = async (id: string) => {
    try { await calendarApi.complete(id); fetchData(filterType); } catch { /* empty */ }
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const statsItems = stats ? [
    { label: 'Total', value: stats.total, color: 'text-primary-600 bg-primary-50', icon: CalendarDays },
    { label: 'Próximos 7d', value: stats.upcoming, color: 'text-amber-600 bg-amber-50', icon: Clock },
    { label: 'Vencidos', value: stats.overdue, color: 'text-red-600 bg-red-50', icon: AlertTriangle },
    { label: 'Completados', value: stats.completed, color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
  ] : [];

  // Eventos del mes visible para el grid
  const monthEvents = events.filter(ev => {
    const d = new Date(ev.start_datetime);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Calendario</h1>
          <p className="text-sm text-surface-500">Plazos procesales, audiencias y eventos del despacho</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Nuevo Evento
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statsItems.map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-surface-900">{s.value}</p>
                    <p className="text-xs text-surface-500">{s.label}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Alerta vencidos/críticos */}
      {stats && (stats.overdue > 0 || stats.critical > 0) && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          <span>
            {stats.overdue > 0 && `${stats.overdue} evento(s) vencido(s). `}
            {stats.critical > 0 && `${stats.critical} evento(s) de prioridad crítica. `}
            {stats.legal_deadlines > 0 && `${stats.legal_deadlines} plazo(s) procesal(es).`}
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Panel lateral: próximos + filtros */}
        <div className="space-y-4 lg:col-span-1">
          {/* Próximos 7 días */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-semibold text-surface-800">Próximos 7 días</p>
              <span className="ml-auto text-xs text-surface-400">{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-xs text-surface-400 text-center py-3">Sin eventos próximos</p>
            ) : (
              <div className="space-y-1.5">
                {upcoming.slice(0, 8).map(ev => {
                  const typeCfg = eventTypeConfig[ev.event_type] || eventTypeConfig.other;
                  return (
                    <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                      className="w-full flex items-center gap-2 rounded-lg p-1.5 text-left hover:bg-surface-50 transition-colors">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs ${typeCfg.color}`}>
                        <CalendarDays className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-surface-800 truncate">{ev.title}</p>
                        <p className="text-[10px] text-surface-400">
                          {new Date(ev.start_datetime).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          {ev.case_number && ` · ${ev.case_number}`}
                        </p>
                      </div>
                      {ev.is_legal_deadline && <Scale className="h-3 w-3 text-red-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Filtros */}
          <Card>
            <p className="text-xs font-semibold text-surface-500 uppercase mb-3">Filtrar</p>
            <div className="space-y-2">
              <select value={filterType}
                onChange={e => { setFilterType(e.target.value); fetchData(e.target.value); }}
                className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none">
                <option value="">Todos los tipos</option>
                {Object.entries(eventTypeConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
              <button onClick={() => { setFilterType(''); fetchData(); }}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-surface-200 py-1.5 text-xs text-surface-500 hover:bg-surface-50">
                <RefreshCw className="h-3.5 w-3.5" /> Limpiar filtros
              </button>
            </div>
            {/* Leyenda colores */}
            <div className="mt-4 space-y-1.5">
              <p className="text-xs font-semibold text-surface-400 uppercase">Tipos</p>
              {Object.entries(eventTypeConfig).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-sm ${v.color.split(' ')[0]}`} />
                  <span className="text-xs text-surface-600">{v.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Vista principal */}
        <div className="lg:col-span-3">
          <Card padding={false}>
            {/* Controles vista */}
            <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <button onClick={prevMonth}
                  className="rounded-lg p-1.5 hover:bg-surface-100 text-surface-500">
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <h2 className="text-base font-semibold text-surface-900 min-w-40 text-center">
                  {MONTHS[viewMonth]} {viewYear}
                </h2>
                <button onClick={nextMonth}
                  className="rounded-lg p-1.5 hover:bg-surface-100 text-surface-500">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={() => { setViewMonth(now.getMonth()); setViewYear(now.getFullYear()); }}
                  className="ml-2 rounded-lg border border-surface-200 px-2.5 py-1 text-xs text-surface-500 hover:bg-surface-50">
                  Hoy
                </button>
              </div>
              <div className="flex rounded-lg border border-surface-200 overflow-hidden">
                <button onClick={() => setView('month')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'month' ? 'bg-primary-600 text-white' : 'text-surface-500 hover:bg-surface-50'}`}>
                  Mes
                </button>
                <button onClick={() => setView('list')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'list' ? 'bg-primary-600 text-white' : 'text-surface-500 hover:bg-surface-50'}`}>
                  Lista
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : view === 'month' ? (
              <MonthGrid
                year={viewYear}
                month={viewMonth}
                events={events}
                onEventClick={setSelectedEvent}
              />
            ) : (
              <div className="p-4 space-y-3">
                {events.length === 0 ? (
                  <div className="py-12 text-center text-sm text-surface-400">
                    <CalendarDays className="mx-auto h-10 w-10 text-surface-200 mb-3" />
                    No hay eventos
                  </div>
                ) : (
                  events.map(ev => (
                    <EventCard key={ev.id} event={ev} onComplete={handleComplete} onClick={setSelectedEvent} />
                  ))
                )}
              </div>
            )}

            {/* Contador en vista mes */}
            {view === 'month' && !loading && (
              <div className="border-t border-surface-100 px-4 py-2 text-xs text-surface-400">
                {monthEvents.length} evento(s) en {MONTHS[viewMonth]}
                {filterType && ` · Filtro: ${eventTypeConfig[filterType]?.label}`}
              </div>
            )}
          </Card>
        </div>
      </div>

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => fetchData(filterType)}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdated={() => { fetchData(filterType); setSelectedEvent(null); }}
        />
      )}
    </div>
  );
}
