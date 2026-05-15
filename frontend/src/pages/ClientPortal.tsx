import { useEffect, useState } from 'react';
import {
  Briefcase, FileText, DollarSign, Clock,
  CheckCircle, AlertTriangle, ChevronRight,
  Calendar, Download,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { casesApi } from '../api/cases';
import { billingApi } from '../api/billing';
import { documentsApi } from '../api/documents';
import { timeTrackingApi } from '../api/timeTracking';
import type { Case, Invoice, Document, TimeEntry } from '../types';
import { useAuth } from '../context/AuthContext';

function fmt(val: string | number) {
  return Number(val).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const caseStatusConfig: Record<string, { label: string; badge: 'default' | 'info' | 'success' | 'warning' | 'danger' }> = {
  open:        { label: 'Abierto',       badge: 'info' },
  in_progress: { label: 'En proceso',    badge: 'warning' },
  on_hold:     { label: 'Suspendido',    badge: 'default' },
  in_appeal:   { label: 'En apelación',  badge: 'warning' },
  closed:      { label: 'Cerrado',       badge: 'success' },
  archived:    { label: 'Archivado',     badge: 'default' },
};

const invoiceStatusConfig: Record<string, { label: string; badge: 'default' | 'info' | 'success' | 'warning' | 'danger' }> = {
  draft:     { label: 'Borrador',  badge: 'default' },
  sent:      { label: 'Enviada',   badge: 'info' },
  paid:      { label: 'Pagada',    badge: 'success' },
  overdue:   { label: 'Vencida',   badge: 'danger' },
  cancelled: { label: 'Cancelada', badge: 'default' },
};

export default function ClientPortal() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cases' | 'invoices' | 'documents' | 'time'>('cases');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      try {
        const [casesRes, invRes, docsRes, timeRes] = await Promise.all([
          casesApi.list({}).catch(() => ({ results: [] })),
          billingApi.list({}).catch(() => ({ results: [] })),
          documentsApi.list({}).catch(() => ({ results: [] })),
          timeTrackingApi.list({}).catch(() => ({ results: [] })),
        ]);
        setCases(Array.isArray(casesRes?.results) ? casesRes.results : []);
        setInvoices(Array.isArray(invRes?.results) ? invRes.results : []);
        setDocuments(Array.isArray(docsRes?.results) ? docsRes.results : []);
        setTimeEntries(Array.isArray(timeRes?.results) ? timeRes.results : []);
      } catch {
        setError('Error al cargar la información. Intenta de nuevo más tarde.');
      }
      setLoading(false);
    };
    load();
  }, []);

  if (!user || user.user_type !== 'client') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Briefcase className="h-12 w-12 text-surface-200" />
        <p className="text-surface-400 text-sm">Esta sección es exclusiva para clientes.</p>
      </div>
    );
  }

  const tabs = [
    { key: 'cases' as const,    label: 'Mis Casos',     icon: Briefcase, count: cases.length },
    { key: 'invoices' as const, label: 'Mis Facturas',  icon: DollarSign, count: invoices.length },
    { key: 'documents' as const,label: 'Documentos',    icon: FileText,   count: documents.length },
    { key: 'time' as const,     label: 'Tiempo Registrado', icon: Clock,  count: timeEntries.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Portal del Cliente</h1>
        <p className="text-sm text-surface-500">
          Bienvenido, {user.first_name || user.username}. Consulta el estado de tus casos y servicios.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Resumen rápido */}
      {!loading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900">{cases.length}</p>
                <p className="text-xs text-surface-500">Casos activos</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900">
                  {invoices.filter(i => i.status === 'paid').length}
                </p>
                <p className="text-xs text-surface-500">Facturas pagadas</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900">
                  {invoices.filter(i => i.status === 'overdue').length}
                </p>
                <p className="text-xs text-surface-500">Facturas vencidas</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-surface-900">
                  {fmt(invoices.reduce((s, i) => s + Number(i.balance_due || 0), 0))}
                </p>
                <p className="text-xs text-surface-500">Saldo pendiente</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-surface-200">
        <nav className="flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-surface-500 hover:text-surface-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    activeTab === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-200" />
          ))}
        </div>
      ) : (
        <>
          {/* Casos */}
          {activeTab === 'cases' && (
            <Card padding={false}>
              {cases.length === 0 ? (
                <div className="py-12 text-center text-sm text-surface-400">
                  <Briefcase className="mx-auto h-10 w-10 text-surface-200 mb-3" />
                  No tienes casos registrados
                </div>
              ) : (
                <div className="divide-y divide-surface-100">
                  {cases.map(c => {
                    const cfg = caseStatusConfig[c.status] || caseStatusConfig.open;
                    return (
                      <div key={c.id} className="flex items-start gap-4 px-6 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-surface-900">{c.case_number}</p>
                            <Badge variant={cfg.badge}>{cfg.label}</Badge>
                            {c.is_urgent && <Badge variant="danger">Urgente</Badge>}
                          </div>
                          <p className="text-sm text-surface-700 mt-0.5">{c.title}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-surface-400 flex-wrap">
                            <span>Tipo: {c.case_type_display}</span>
                            {c.jurisdiction && <span>Jurisdicción: {c.jurisdiction}</span>}
                            {c.court && <span>Tribunal: {c.court}</span>}
                            <span>Apertura: {fmtDate(c.opened_at)}</span>
                            {c.dates && c.dates.filter(d => !d.is_completed).length > 0 && (
                              <span className="flex items-center gap-1 text-amber-600">
                                <Calendar className="h-3 w-3" />
                                {c.dates.filter(d => !d.is_completed).length} fecha(s) pendiente(s)
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-surface-300 shrink-0 mt-1" />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Facturas */}
          {activeTab === 'invoices' && (
            <Card padding={false}>
              {invoices.length === 0 ? (
                <div className="py-12 text-center text-sm text-surface-400">
                  <DollarSign className="mx-auto h-10 w-10 text-surface-200 mb-3" />
                  No tienes facturas registradas
                </div>
              ) : (
                <div className="divide-y divide-surface-100">
                  {invoices.map(inv => {
                    const cfg = invoiceStatusConfig[inv.status] || invoiceStatusConfig.draft;
                    return (
                      <div key={inv.id} className="flex items-center gap-4 px-6 py-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                          inv.status === 'overdue' ? 'bg-red-50 text-red-600' :
                          inv.status === 'sent' ? 'bg-amber-50 text-amber-600' :
                          'bg-surface-100 text-surface-500'
                        }`}>
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-surface-900">{inv.invoice_number}</p>
                            <Badge variant={cfg.badge}>{cfg.label}</Badge>
                          </div>
                          <p className="text-xs text-surface-400 mt-0.5">
                            {inv.case_number || 'Sin caso'} — Vence: {fmtDate(inv.due_date)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-surface-900">{fmt(inv.total)}</p>
                          {Number(inv.balance_due) > 0 && (
                            <p className="text-xs text-red-500">Pendiente: {fmt(inv.balance_due)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Documentos */}
          {activeTab === 'documents' && (
            <Card padding={false}>
              {documents.length === 0 ? (
                <div className="py-12 text-center text-sm text-surface-400">
                  <FileText className="mx-auto h-10 w-10 text-surface-200 mb-3" />
                  No hay documentos disponibles para tu consulta
                </div>
              ) : (
                <div className="divide-y divide-surface-100">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-900 truncate">{doc.title}</p>
                        <p className="text-xs text-surface-400 mt-0.5">
                          {doc.document_type} — v{doc.current_version} — {fmtDate(doc.created_at)}
                        </p>
                      </div>
                      {!doc.is_confidential && (
                        <button className="flex items-center gap-1.5 rounded-lg border border-surface-300 px-3 py-1.5 text-xs text-surface-600 hover:bg-surface-50">
                          <Download className="h-3 w-3" />
                          Descargar
                        </button>
                      )}
                      {doc.is_confidential && (
                        <span className="text-xs text-surface-400">Confidencial</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Tiempo */}
          {activeTab === 'time' && (
            <Card padding={false}>
              {timeEntries.length === 0 ? (
                <div className="py-12 text-center text-sm text-surface-400">
                  <Clock className="mx-auto h-10 w-10 text-surface-200 mb-3" />
                  No hay registros de tiempo para tu caso
                </div>
              ) : (
                <>
                  <div className="border-b border-surface-100 bg-surface-50 px-6 py-3 flex items-center justify-between">
                    <p className="text-xs text-surface-500 font-medium">
                      {timeEntries.length} registros —{' '}
                      {timeEntries.reduce((s, t) => s + (t.duration_hours || 0), 0).toFixed(1)}h totales
                    </p>
                    <p className="text-xs text-amber-600 font-medium">
                      Facturable: {fmt(timeEntries.reduce((s, t) => s + (Number(t.billable_amount) || 0), 0))}
                    </p>
                  </div>
                  <div className="divide-y divide-surface-100">
                    {timeEntries.map(entry => (
                      <div key={entry.id} className="flex items-center gap-4 px-6 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-surface-800 truncate">{entry.description}</p>
                          <p className="text-xs text-surface-400 mt-0.5">
                            {entry.case_number} — {entry.task_type_display} — {fmtDate(entry.date)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-surface-900">{entry.duration_hours}h</p>
                          {entry.is_billable && Number(entry.billable_amount) > 0 && (
                            <p className="text-xs text-amber-600">{fmt(entry.billable_amount)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
