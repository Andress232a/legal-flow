import { useEffect, useState } from 'react';
import {
  FileText, Plus, Search, DollarSign, CheckCircle, Clock,
  AlertTriangle, XCircle, ChevronRight, Trash2, CreditCard,
  RefreshCw, Tag,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { billingApi } from '../api/billing';
import { casesApi } from '../api/cases';
import { usersApi } from '../api/users';
import type { Invoice, InvoiceStats, Case, User } from '../types';
import { useAuth } from '../context/AuthContext';

// ─── Mappings ─────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; badge: 'default' | 'warning' | 'success' | 'info' | 'danger'; icon: typeof CheckCircle }> = {
  draft:     { label: 'Borrador',  badge: 'default', icon: FileText },
  sent:      { label: 'Enviada',   badge: 'info',    icon: Clock },
  paid:      { label: 'Pagada',    badge: 'success', icon: CheckCircle },
  overdue:   { label: 'Vencida',   badge: 'danger',  icon: AlertTriangle },
  cancelled: { label: 'Cancelada', badge: 'default', icon: XCircle },
};

const methodLabels: Record<string, string> = {
  transfer: 'Transferencia', cash: 'Efectivo',
  card: 'Tarjeta', check: 'Cheque', other: 'Otro',
};

function fmt(val: string | number) {
  return Number(val).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Create Invoice Modal ─────────────────────────────────────────────────────

function CreateInvoiceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user: authUser } = useAuth();
  const [form, setForm] = useState({
    case_id: '', client_id: '', issue_date: '', due_date: '',
    tax_rate: '0', notes: '', case_number: '', client_name: '',
  });
  const [items, setItems] = useState([{ description: '', quantity: '1', unit_price: '' }]);
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    casesApi.list({}).then(r => setCases(r.results)).catch(() => setCases([]));
    usersApi.clients().then(setClients).catch(() => setClients([]));
  }, []);

  const handleCaseChange = (caseId: string) => {
    const c = cases.find(x => x.id === caseId);
    setForm(f => ({ ...f, case_id: caseId, case_number: c?.case_number || '' }));
  };

  const addItem = () => setItems(i => [...i, { description: '', quantity: '1', unit_price: '' }]);
  const removeItem = (idx: number) => setItems(i => i.filter((_, j) => j !== idx));
  const setItem = (idx: number, key: string, val: string) =>
    setItems(i => i.map((item, j) => j === idx ? { ...item, [key]: val } : item));

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity || '0') * parseFloat(i.unit_price || '0')), 0);
  const taxAmt = subtotal * parseFloat(form.tax_rate || '0') / 100;
  const total = subtotal + taxAmt;

  const handleSubmit = async () => {
    if (!form.case_id) return setError('Selecciona un caso.');
    if (!form.client_id) return setError('Selecciona un cliente.');
    if (!form.issue_date) return setError('La fecha de emisión es obligatoria.');
    if (!form.due_date) return setError('La fecha de vencimiento es obligatoria.');
    if (items.some(i => !i.description || !i.unit_price)) return setError('Completa todos los ítems.');
    setError(''); setSubmitting(true);
    try {
      const client = clients.find(c => c.id === form.client_id);
      await billingApi.create({
        ...form,
        client_name: client ? `${client.first_name} ${client.last_name}`.trim() || client.username : '',
        items: items.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
      });
      onSuccess(); onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, unknown> } };
      setError(err?.response?.data ? JSON.stringify(err.response.data) : 'Error al crear la factura.');
    }
    setSubmitting(false);
  };

  const sel = "block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

  return (
    <Modal open onClose={onClose} title="Nueva Factura" size="lg">
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Caso.</label>
            <select value={form.case_id} onChange={e => handleCaseChange(e.target.value)} className={sel}>
              <option value="">Seleccionar caso...</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.case_number} — {c.title}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Cliente.</label>
            <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className={sel}>
              <option value="">Seleccionar cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.username})</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input label="Fecha emisión." type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} required />
          <Input label="Fecha vencimiento." type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
          <Input label="IVA (%)." type="number" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} />
        </div>

        {/* Ítems */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-surface-700">Ítems de factura.</p>
            <button onClick={addItem} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              <Plus className="h-3 w-3" /> Agregar ítem
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <input placeholder="Descripción" value={item.description}
                    onChange={e => setItem(idx, 'description', e.target.value)}
                    className="block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <input placeholder="Cant." type="number" value={item.quantity}
                    onChange={e => setItem(idx, 'quantity', e.target.value)}
                    className="block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div className="col-span-3">
                  <input placeholder="Precio unit." type="number" value={item.unit_price}
                    onChange={e => setItem(idx, 'unit_price', e.target.value)}
                    className="block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div className="col-span-1 flex justify-center">
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-surface-50 p-3 text-sm space-y-1">
            <div className="flex justify-between text-surface-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between text-surface-500"><span>IVA ({form.tax_rate}%)</span><span>{fmt(taxAmt)}</span></div>
            <div className="flex justify-between font-semibold text-surface-900 border-t border-surface-200 pt-1 mt-1"><span>Total</span><span>{fmt(total)}</span></div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-surface-700">Notas.</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
            className="block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}>Crear Factura</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Invoice Detail Modal ─────────────────────────────────────────────────────

function InvoiceDetailModal({ invoice, onClose, onUpdated }: { invoice: Invoice; onClose: () => void; onUpdated: () => void }) {
  const { user: authUser } = useAuth();
  const canManage = authUser?.user_type === 'admin' || authUser?.user_type === 'lawyer';
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [payForm, setPayForm] = useState({ amount: '', method: 'transfer', payment_date: '', reference: '' });
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState('');
  const [showPayForm, setShowPayForm] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    try { setDetail(await billingApi.get(invoice.id)); } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { loadDetail(); }, []);

  const handleChangeStatus = async (s: string) => {
    try { setDetail(await billingApi.changeStatus(invoice.id, s)); onUpdated(); } catch { /* empty */ }
  };

  const handlePayment = async () => {
    if (!payForm.amount || !payForm.payment_date) return setPayError('Completa monto y fecha.');
    setPayError(''); setPaySubmitting(true);
    try {
      await billingApi.addPayment(invoice.id, payForm);
      setShowPayForm(false);
      setPayForm({ amount: '', method: 'transfer', payment_date: '', reference: '' });
      await loadDetail();
      onUpdated();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setPayError(err?.response?.data?.detail || 'Error al registrar el pago.');
    }
    setPaySubmitting(false);
  };

  const d = detail || invoice;
  const cfg = statusConfig[d.status] || statusConfig.draft;
  const StatusIcon = cfg.icon;

  const sel = "block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none";

  return (
    <Modal open onClose={onClose} title={`Factura ${d.invoice_number}`} size="lg">
      <div className="space-y-5">
        {/* Header info */}
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-surface-50 p-4">
          <div>
            <p className="text-xs text-surface-400">Caso</p>
            <p className="text-sm font-semibold">{d.case_number || d.case_id}</p>
          </div>
          <div>
            <p className="text-xs text-surface-400">Cliente</p>
            <p className="text-sm font-semibold">{d.client_name || d.client_id}</p>
          </div>
          <div>
            <p className="text-xs text-surface-400">Emisión</p>
            <p className="text-sm">{fmtDate(d.issue_date)}</p>
          </div>
          <div>
            <p className="text-xs text-surface-400">Vencimiento</p>
            <p className="text-sm">{fmtDate(d.due_date)}</p>
          </div>
        </div>

        {/* Estado + acciones */}
        <div className="flex items-center justify-between">
          <Badge variant={cfg.badge}>
            <StatusIcon className="h-3 w-3 mr-1" />{cfg.label}
          </Badge>
          {canManage && d.status !== 'cancelled' && d.status !== 'paid' && (
            <div className="flex gap-2">
              {d.status === 'draft' && (
                <Button variant="secondary" onClick={() => handleChangeStatus('sent')}>
                  Marcar como enviada
                </Button>
              )}
              {(d.status === 'sent' || d.status === 'overdue') && (
                <Button onClick={() => setShowPayForm(true)}>
                  <CreditCard className="h-4 w-4" /> Registrar pago
                </Button>
              )}
              <Button variant="secondary" onClick={() => handleChangeStatus('cancelled')}>
                Cancelar factura
              </Button>
            </div>
          )}
        </div>

        {/* Form pago */}
        {showPayForm && (
          <div className="rounded-lg border border-surface-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-surface-700">Registrar pago.</p>
            {payError && <div className="text-sm text-red-600">{payError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <Input label="Monto." type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-surface-700">Método.</label>
                <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))} className={sel}>
                  {Object.entries(methodLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <Input label="Fecha de pago." type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
              <Input label="Referencia." value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePayment} loading={paySubmitting}>Confirmar pago</Button>
              <Button variant="secondary" onClick={() => setShowPayForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Ítems */}
        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-surface-200" />
        ) : (
          <div>
            <p className="text-sm font-semibold text-surface-700 mb-2">Ítems.</p>
            <div className="rounded-lg border border-surface-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-surface-500">Descripción</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-surface-500">Cant.</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-surface-500">P. Unit.</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-surface-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {(d.items || []).map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">{item.description}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">{fmt(item.unit_price)}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmt(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-50 border-t border-surface-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right text-xs text-surface-400">Subtotal</td>
                    <td className="px-4 py-2 text-right text-sm">{fmt(d.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right text-xs text-surface-400">IVA ({d.tax_rate}%)</td>
                    <td className="px-4 py-2 text-right text-sm">{fmt(d.tax_amount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right font-semibold text-surface-900">Total</td>
                    <td className="px-4 py-2 text-right font-semibold text-surface-900">{fmt(d.total)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right text-xs text-surface-400">Pagado</td>
                    <td className="px-4 py-2 text-right text-sm text-emerald-600">{fmt(d.amount_paid)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right font-semibold text-red-600">Saldo pendiente</td>
                    <td className="px-4 py-2 text-right font-semibold text-red-600">{fmt(d.balance_due)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Pagos */}
        {(d.payments || []).length > 0 && (
          <div>
            <p className="text-sm font-semibold text-surface-700 mb-2">Pagos registrados.</p>
            <div className="space-y-2">
              {(d.payments || []).map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-surface-100 bg-white px-4 py-2.5">
                  <div>
                    <span className="text-sm font-medium text-emerald-700">{fmt(p.amount)}</span>
                    <span className="ml-2 text-xs text-surface-400">{methodLabels[p.method] || p.method}</span>
                    {p.reference && <span className="ml-2 text-xs text-surface-400">Ref: {p.reference}</span>}
                  </div>
                  <span className="text-xs text-surface-400">{fmtDate(p.payment_date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Billing() {
  const { user: authUser } = useAuth();
  const canCreate = authUser?.user_type === 'admin' || authUser?.user_type === 'lawyer';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchData = async (q = '', st = '') => {
    setLoading(true); setError('');
    try {
      const [invRes, statsRes] = await Promise.all([
        billingApi.list({ search: q || undefined, status: st || undefined }),
        billingApi.stats(),
      ]);
      setInvoices(invRes.results);
      setStats(statsRes);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err?.response?.status === 403) {
        setError('No tienes permisos para ver las facturas.');
      } else {
        setError('No se pudo conectar con el Billing Service. Verifica que el servicio está levantado.');
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const statsItems = stats ? [
    { label: 'Total facturas', value: stats.total, color: 'text-primary-600 bg-primary-50', icon: FileText },
    { label: 'Pagadas', value: stats.paid, color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
    { label: 'Por cobrar', value: stats.sent, color: 'text-amber-600 bg-amber-50', icon: Clock },
    { label: 'Vencidas', value: stats.overdue, color: 'text-red-600 bg-red-50', icon: AlertTriangle },
  ] : [];

  const moneyStats = stats ? [
    { label: 'Total facturado', value: stats.total_billed },
    { label: 'Total cobrado', value: stats.total_paid },
    { label: 'Pendiente de cobro', value: stats.total_pending },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Facturación</h1>
          <p className="text-sm text-surface-500">Gestión de facturas y pagos del despacho</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Nueva Factura
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* KPI cards */}
      {stats && (
        <>
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

          <div className="grid grid-cols-3 gap-4">
            {moneyStats.map(s => (
              <Card key={s.label} className="text-center">
                <p className="text-xl font-bold text-surface-900">{fmt(s.value)}</p>
                <p className="text-xs text-surface-500 mt-1">{s.label}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Filtros */}
      <Card padding={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-surface-200 p-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="text" placeholder="Buscar facturas..." value={search}
              onChange={e => { setSearch(e.target.value); fetchData(e.target.value, filterStatus); }}
              className="w-full rounded-lg border border-surface-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); fetchData(search, e.target.value); }}
            className="rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          >
            <option value="">Todos los estados</option>
            {Object.entries(statusConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
          <button onClick={() => { setSearch(''); setFilterStatus(''); fetchData(); }}
            className="rounded-lg border border-surface-300 p-2 text-surface-500 hover:bg-surface-50">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Lista */}
        <div className="divide-y divide-surface-100">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-10 w-10 animate-pulse rounded-lg bg-surface-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-surface-200" />
                  <div className="h-3 w-32 animate-pulse rounded bg-surface-200" />
                </div>
              </div>
            ))
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-sm text-surface-400">
              <DollarSign className="mx-auto h-10 w-10 text-surface-200 mb-3" />
              No hay facturas
            </div>
          ) : (
            invoices.map(inv => {
              const cfg = statusConfig[inv.status] || statusConfig.draft;
              const StatusIcon = cfg.icon;
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-50"
                >
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
                      <Badge variant={cfg.badge}><StatusIcon className="h-3 w-3 mr-1" />{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-surface-400 mt-0.5">
                      {inv.case_number || 'Sin caso'} — {inv.client_name || 'Sin cliente'} — Vence: {fmtDate(inv.due_date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-surface-900">{fmt(inv.total)}</p>
                    {Number(inv.balance_due) > 0 && (
                      <p className="text-xs text-red-500">Pendiente: {fmt(inv.balance_due)}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-surface-300 shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </Card>

      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => fetchData(search, filterStatus)}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onUpdated={() => fetchData(search, filterStatus)}
        />
      )}
    </div>
  );
}
