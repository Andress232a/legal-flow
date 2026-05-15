import { useEffect, useState } from 'react';
import {
  BarChart3, Briefcase, Clock, DollarSign, Calendar,
  TrendingUp, AlertTriangle, CheckCircle, FileText,
  RefreshCw, Target,
} from 'lucide-react';
import Card from '../components/ui/Card';
import { analyticsApi, type AnalyticsDashboard, type DeadlineCompliance } from '../api/analytics';
import { useAuth } from '../context/AuthContext';

function fmt(val: string | number) {
  return Number(val).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

function KpiCard({ icon: Icon, label, value, color, sub }: {
  icon: typeof BarChart3; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold text-surface-900 leading-tight">{value}</p>
          <p className="text-xs text-surface-500 mt-0.5">{label}</p>
          {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-surface-600">{label}</span>
        <span className="font-semibold text-surface-800">{value} <span className="text-surface-400">({pct}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-surface-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const caseStatusLabels: Record<string, string> = {
  open: 'Abierto', in_progress: 'En proceso', on_hold: 'Suspendido',
  in_appeal: 'En apelación', closed: 'Cerrado', archived: 'Archivado',
};
const caseTypeLabels: Record<string, string> = {
  civil: 'Civil', criminal: 'Penal', corporate: 'Corporativo',
  family: 'Familia', labor: 'Laboral', administrative: 'Administrativo',
  constitutional: 'Constitucional', other: 'Otro',
};
const statusColors = ['bg-blue-400', 'bg-indigo-400', 'bg-amber-400', 'bg-orange-400', 'bg-emerald-400', 'bg-surface-400'];

function DashboardContent({ d, c }: { d: AnalyticsDashboard; c: DeadlineCompliance | null }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={Briefcase} label="Total casos" value={d.cases.total} color="bg-primary-50 text-primary-600"
          sub={`${d.cases.open} activos · ${d.cases.urgent} urgentes`} />
        <KpiCard icon={DollarSign} label="Facturado total" value={fmt(d.billing.total_billed)} color="bg-emerald-50 text-emerald-600"
          sub={`Cobrado: ${fmt(d.billing.total_paid)}`} />
        <KpiCard icon={Clock} label="Horas registradas" value={`${d.time.total_hours}h`} color="bg-amber-50 text-amber-600"
          sub={`${d.time.billable_hours}h facturables`} />
        <KpiCard icon={Calendar} label="Eventos pendientes" value={d.calendar.upcoming} color="bg-blue-50 text-blue-600"
          sub={`${d.calendar.overdue} vencidos · ${d.calendar.critical} críticos`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-surface-800">Estado de facturación</h2>
          </div>
          <div className="space-y-3">
            <StatusBar label="Pagadas" value={d.billing.paid} total={d.billing.total} color="bg-emerald-400" />
            <StatusBar label="Enviadas" value={d.billing.sent} total={d.billing.total} color="bg-blue-400" />
            <StatusBar label="Vencidas" value={d.billing.overdue} total={d.billing.total} color="bg-red-400" />
            <StatusBar label="Borradores" value={d.billing.draft} total={d.billing.total} color="bg-surface-300" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-surface-50 p-3">
            <div className="text-center">
              <p className="text-sm font-bold text-emerald-700">{fmt(d.billing.total_paid)}</p>
              <p className="text-xs text-surface-400">Cobrado</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-amber-700">{fmt(d.billing.total_pending)}</p>
              <p className="text-xs text-surface-400">Pendiente</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-surface-700">{d.billing.total}</p>
              <p className="text-xs text-surface-400">Facturas</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-surface-800">Cumplimiento de plazos legales</h2>
          </div>
          {c ? (
            <>
              <div className="flex items-center justify-center py-4">
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full"
                  style={{ background: `conic-gradient(#10b981 ${c.compliance_rate * 3.6}deg, #f3f4f6 0deg)` }}>
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">{c.compliance_rate}%</p>
                      <p className="text-xs text-surface-400">cumplidos</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="rounded-lg bg-emerald-50 p-3 text-center">
                  <p className="text-xl font-bold text-emerald-700">{c.completed}</p>
                  <p className="text-xs text-emerald-600">Completados</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-xl font-bold text-red-700">{c.overdue}</p>
                  <p className="text-xs text-red-600">Vencidos</p>
                </div>
                <div className="rounded-lg bg-surface-50 p-3 text-center">
                  <p className="text-xl font-bold text-surface-700">{c.total_deadlines}</p>
                  <p className="text-xs text-surface-500">Plazos legales</p>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-sm text-surface-400">Sin datos de plazos</div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-surface-800">Casos por estado</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(d.cases.by_status).length === 0
              ? <p className="text-sm text-surface-400 text-center py-4">Sin datos</p>
              : Object.entries(d.cases.by_status).map(([k, v], i) => (
                <StatusBar key={k} label={caseStatusLabels[k] || k} value={v}
                  total={d.cases.total} color={statusColors[i % statusColors.length]} />
              ))}
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-surface-800">Casos por tipo</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(d.cases.by_type).length === 0
              ? <p className="text-sm text-surface-400 text-center py-4">Sin datos</p>
              : Object.entries(d.cases.by_type).map(([k, v], i) => (
                <StatusBar key={k} label={caseTypeLabels[k] || k} value={v}
                  total={d.cases.total} color={statusColors[i % statusColors.length]} />
              ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-surface-800">Control de tiempo</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { val: d.time.total_entries, label: 'Registros totales', cls: 'bg-surface-50', txt: 'text-surface-900' },
            { val: `${d.time.total_hours}h`, label: 'Horas totales', cls: 'bg-surface-50', txt: 'text-surface-900' },
            { val: `${d.time.billable_hours}h`, label: 'Horas facturables', cls: 'bg-amber-50', txt: 'text-amber-700' },
            { val: fmt(d.time.billable_amount), label: 'Monto facturable', cls: 'bg-emerald-50', txt: 'text-emerald-700' },
          ].map(item => (
            <div key={item.label} className={`rounded-lg ${item.cls} p-4 text-center`}>
              <p className={`text-2xl font-bold ${item.txt}`}>{item.val}</p>
              <p className="text-xs text-surface-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {(d.cases.urgent > 0 || d.billing.overdue > 0 || d.calendar.overdue > 0) && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-surface-800">Alertas que requieren atención</h2>
          </div>
          <div className="space-y-2">
            {d.cases.urgent > 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5">
                <Briefcase className="h-4 w-4 text-red-600 shrink-0" />
                <p className="text-sm text-red-700"><span className="font-semibold">{d.cases.urgent}</span> caso{d.cases.urgent > 1 ? 's' : ''} urgente{d.cases.urgent > 1 ? 's' : ''}</p>
              </div>
            )}
            {d.billing.overdue > 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-orange-100 bg-orange-50 px-4 py-2.5">
                <DollarSign className="h-4 w-4 text-orange-600 shrink-0" />
                <p className="text-sm text-orange-700"><span className="font-semibold">{d.billing.overdue}</span> factura{d.billing.overdue > 1 ? 's' : ''} vencida{d.billing.overdue > 1 ? 's' : ''}</p>
              </div>
            )}
            {d.calendar.overdue > 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5">
                <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700"><span className="font-semibold">{d.calendar.overdue}</span> evento{d.calendar.overdue > 1 ? 's' : ''} vencido{d.calendar.overdue > 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-surface-800">Agenda y plazos</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { val: d.calendar.upcoming, label: 'Próximos eventos', cls: 'bg-blue-50', txt: 'text-blue-700' },
            { val: d.calendar.overdue, label: 'Vencidos', cls: 'bg-red-50', txt: 'text-red-700' },
            { val: d.calendar.completed, label: 'Completados', cls: 'bg-emerald-50', txt: 'text-emerald-700' },
            { val: d.calendar.critical, label: 'Críticos', cls: 'bg-amber-50', txt: 'text-amber-700' },
          ].map(item => (
            <div key={item.label} className={`rounded-lg ${item.cls} p-4 text-center`}>
              <p className={`text-2xl font-bold ${item.txt}`}>{item.val}</p>
              <p className="text-xs mt-1" style={{ color: 'inherit', opacity: 0.7 }}>{item.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-center gap-2 py-2">
        <CheckCircle className="h-4 w-4 text-emerald-500" />
        <p className="text-xs text-surface-400">Datos en tiempo real desde todos los microservicios</p>
      </div>
    </>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [compliance, setCompliance] = useState<DeadlineCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [dash, comp] = await Promise.all([
        analyticsApi.dashboard(),
        analyticsApi.deadlineCompliance(),
      ]);
      setDashboard(dash ?? null);
      setCompliance(comp ?? null);
    } catch {
      setDashboard(null);
      setCompliance(null);
      setError('No se pudo conectar con el servicio de Analytics. Verifica que el servicio está levantado en Docker.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (!user || (user.user_type !== 'admin' && user.user_type !== 'lawyer')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-surface-400 text-sm">No tienes acceso a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Analytics</h1>
          <p className="text-sm text-surface-500">Resumen ejecutivo del despacho</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-600 hover:bg-surface-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-200" />
          ))}
        </div>
      )}

      {!loading && dashboard && (
        <DashboardContent d={dashboard} c={compliance} />
      )}
    </div>
  );
}
