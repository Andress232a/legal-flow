import { useEffect, useState, type ReactNode } from 'react';
import {
  Upload, Search, Download, FileText, Eye, Clock, Shield,
  Tag, History, ChevronRight, Plus, X, RefreshCw,
  Scale, File, ScanSearch, Building2, PenLine, Receipt, Mail,
  FileEdit, CheckCircle, Archive, FilePen, RotateCcw,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { documentsApi } from '../api/documents';
import { casesApi } from '../api/cases';
import type { Document as DocType, DocumentVersion, Case } from '../types';
import { useAuth } from '../context/AuthContext';

// ─── Mappings ─────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; badge: 'default' | 'warning' | 'success' | 'info' | 'danger'; icon: ReactNode }> = {
  draft:    { label: 'Borrador',    badge: 'default', icon: <FilePen className="h-3.5 w-3.5" /> },
  review:   { label: 'En revisión', badge: 'warning', icon: <Eye className="h-3.5 w-3.5" /> },
  approved: { label: 'Aprobado',    badge: 'success', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  signed:   { label: 'Firmado',     badge: 'info',    icon: <PenLine className="h-3.5 w-3.5" /> },
  archived: { label: 'Archivado',   badge: 'danger',  icon: <Archive className="h-3.5 w-3.5" /> },
};

const typeConfig: Record<string, { label: string; icon: ReactNode; color: string }> = {
  contract:         { label: 'Contrato',        icon: <FileText className="h-5 w-5" />,    color: 'bg-blue-50 text-blue-600' },
  lawsuit:          { label: 'Demanda',          icon: <Scale className="h-5 w-5" />,       color: 'bg-red-50 text-red-600' },
  brief:            { label: 'Escrito',          icon: <FileEdit className="h-5 w-5" />,    color: 'bg-violet-50 text-violet-600' },
  evidence:         { label: 'Prueba',           icon: <ScanSearch className="h-5 w-5" />, color: 'bg-amber-50 text-amber-600' },
  ruling:           { label: 'Sentencia',        icon: <Building2 className="h-5 w-5" />,   color: 'bg-emerald-50 text-emerald-600' },
  power_of_attorney:{ label: 'Poder Notarial',   icon: <PenLine className="h-5 w-5" />,     color: 'bg-teal-50 text-teal-600' },
  invoice:          { label: 'Factura',          icon: <Receipt className="h-5 w-5" />,     color: 'bg-green-50 text-green-600' },
  correspondence:   { label: 'Correspondencia',  icon: <Mail className="h-5 w-5" />,        color: 'bg-orange-50 text-orange-600' },
  other:            { label: 'Otro',             icon: <File className="h-5 w-5" />,        color: 'bg-surface-100 text-surface-500' },
};

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DocTypeIcon({ type }: { type: string }) {
  const cfg = typeConfig[type] || typeConfig.other;
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
      {cfg.icon}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DocumentDetailModal({ doc, onClose, onNewVersion, canManage }: {
  doc: DocType; onClose: () => void; onNewVersion: () => void;
  canManage: boolean;
}) {
  const [tab, setTab] = useState<'info' | 'versions' | 'audit'>('info');
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    if (tab === 'versions') {
      setLoadingVersions(true);
      documentsApi.getVersions(doc.id).then(setVersions).catch(() => {}).finally(() => setLoadingVersions(false));
    }
  }, [tab, doc.id]);

  const handleDownload = async () => {
    try {
      const blob = await documentsApi.download(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = doc.original_filename; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Error al descargar.'); }
  };

  const status = statusConfig[doc.status] || statusConfig.draft;
  const type = typeConfig[doc.document_type] || typeConfig.other;

  return (
    <Modal open onClose={onClose} title={doc.title}>
      <div className="space-y-4">
        <div className="flex gap-1 rounded-lg bg-surface-100 p-1">
          {[{ id: 'info', label: 'Información' }, { id: 'versions', label: `Versiones (${doc.current_version})` }, { id: 'audit', label: 'Auditoría' }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${tab === t.id ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Tipo', value: <span className="flex items-center gap-1.5 text-sm font-medium">{type.icon} {type.label}</span> },
                { label: 'Estado', value: <Badge variant={status.badge}>{status.label}</Badge> },
                { label: 'Tamaño', value: formatBytes(doc.file_size) },
                { label: 'Versión actual', value: `v${doc.current_version}` },
                { label: 'Fecha subida', value: formatDate(doc.created_at) },
                { label: 'Confidencial', value: doc.is_confidential ? <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-red-500" /> Sí</span> : 'No' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-surface-50 p-3">
                  <p className="text-xs text-surface-400">{item.label}</p>
                  <div className="mt-1 text-sm font-medium text-surface-800">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-surface-50 p-3">
              <p className="text-xs text-surface-400">Archivo</p>
              <p className="mt-1 text-sm font-mono text-surface-700 break-all">{doc.original_filename}</p>
            </div>
            <div className="rounded-lg bg-surface-50 p-3">
              <p className="text-xs text-surface-400">ID del Caso</p>
              <p className="mt-1 text-xs font-mono text-surface-500 break-all">{doc.case_id}</p>
            </div>
            {doc.tags?.length > 0 && (
              <div className="rounded-lg bg-surface-50 p-3">
                <p className="text-xs text-surface-400 mb-2">Etiquetas</p>
                <div className="flex flex-wrap gap-1">
                  {doc.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                      <Tag className="h-3 w-3" /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button onClick={handleDownload} size="sm" className="flex-1">
                <Download className="h-4 w-4" /> Descargar v{doc.current_version}
              </Button>
              {canManage && (
                <Button variant="secondary" onClick={onNewVersion} size="sm">
                  <Plus className="h-4 w-4" /> Nueva versión
                </Button>
              )}
            </div>
          </div>
        )}

        {tab === 'versions' && (
          <div className="space-y-2">
            {loadingVersions ? (
              <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>
            ) : versions.length === 0 ? (
              <p className="py-6 text-center text-sm text-surface-400">No hay versiones registradas</p>
            ) : (
              versions.map((v) => (
                <div key={v.id} className="flex items-start gap-3 rounded-lg border border-surface-200 p-3 hover:bg-surface-50 transition-colors">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${v.version_number === doc.current_version ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600'}`}>
                    v{v.version_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-surface-900 truncate">{v.original_filename}</p>
                      {v.version_number === doc.current_version && <Badge variant="success">Actual</Badge>}
                    </div>
                    <p className="text-xs text-surface-400 mt-0.5">{formatBytes(v.file_size)} · {formatDate(v.created_at)}</p>
                    {v.change_summary && <p className="mt-1 text-xs text-surface-600 italic">"{v.change_summary}"</p>}
                    <p className="mt-1 text-xs font-mono text-surface-300 truncate">SHA256: {v.file_hash?.slice(0, 24)}...</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const blob = await documentsApi.downloadVersion(doc.id, v.version_number);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = v.original_filename;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch { alert('Error al descargar la versión.'); }
                    }}
                    className="shrink-0 rounded-lg p-2 text-surface-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    title={`Descargar v${v.version_number}`}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'audit' && (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800 mb-2">
                <Shield className="h-4 w-4" /> Auditoría completa activa
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                Cada acceso a este documento queda registrado automáticamente: quién accedió, qué acción realizó (lectura, descarga, modificación), desde qué IP y si fue exitoso o denegado.
              </p>
            </div>
            <div className="rounded-lg bg-surface-50 p-3">
              <p className="text-xs font-medium text-surface-500 mb-2">Endpoint de auditoría</p>
              <code className="text-xs text-surface-700 break-all">
                GET /api/documents/{doc.id.slice(0, 8)}…/audit-log/
              </code>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── New Version Modal ────────────────────────────────────────────────────────

function NewVersionModal({ doc, onClose, onSuccess }: { doc: DocType; onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!file) return setError('Selecciona un archivo.');
    setError(''); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('change_summary', summary);
      await documentsApi.uploadNewVersion(doc.id, fd);
      onSuccess(); onClose();
    } catch { setError('Error al subir la versión.'); }
    setSubmitting(false);
  };

  return (
    <Modal open onClose={onClose} title={`Nueva versión — ${doc.title}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-surface-50 p-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-surface-200 px-2.5 py-1 text-xs font-semibold text-surface-600">v{doc.current_version} actual</span>
            <RotateCcw className="h-4 w-4 text-surface-400" />
            <span className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-700">v{doc.current_version + 1} nueva</span>
          </div>
        </div>
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-surface-700">Archivo nuevo</label>
          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-surface-300 rounded-xl cursor-pointer hover:bg-surface-50 transition-colors">
            <Upload className="mb-1 h-6 w-6 text-surface-400" />
            <p className="text-sm text-surface-500">{file ? file.name : 'Seleccionar archivo'}</p>
            {file && <p className="text-xs text-surface-400">{formatBytes(file.size)}</p>}
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <Input label="Descripción del cambio" placeholder="Ej: Actualización de cláusulas de rescisión" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}><Upload className="h-4 w-4" /> Subir v{doc.current_version + 1}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: '', description: '', document_type: 'other', status: 'draft', case_id: '', is_confidential: false, tags: '' });
  const [cases, setCases] = useState<Case[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    casesApi.list({ page: 1 }).then(r => setCases(Array.isArray(r?.results) ? r.results : [])).catch(() => setCases([])).finally(() => setCasesLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!file) return setError('Selecciona un archivo.');
    if (!form.case_id) return setError('Debes seleccionar un caso.');
    setError(''); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', form.title || file.name);
      fd.append('description', form.description);
      fd.append('document_type', form.document_type);
      fd.append('status', form.status);
      fd.append('case_id', form.case_id);
      fd.append('is_confidential', String(form.is_confidential));
      if (form.tags) form.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => fd.append('tags', t));
      await documentsApi.upload(fd);
      onSuccess(); onClose();
    } catch { setError('Error al subir. Verifica tus permisos y los datos.'); }
    setSubmitting(false);
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const selectCls = "block w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

  return (
    <Modal open onClose={onClose} title="Subir Documento">
      <div className="space-y-4">
        {error && <div className="whitespace-pre-line rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-surface-700">Archivo.</label>
          <label className="relative flex flex-col items-center justify-center w-full border-2 border-dashed border-surface-300 rounded-xl cursor-pointer hover:bg-surface-50 transition-colors overflow-hidden"
            style={{ minHeight: '7rem' }}>
            {file && file.type.startsWith('image/') ? (
              <>
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full max-h-48 object-contain rounded-xl"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-2 bg-gradient-to-t from-black/40 to-transparent rounded-xl">
                  <p className="text-xs font-medium text-white truncate max-w-xs px-2">{file.name}</p>
                  <p className="text-xs text-white/70">{formatBytes(file.size)}</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <Upload className="mb-1 h-6 w-6 text-surface-400" />
                <p className="text-sm text-surface-500">{file ? file.name : 'Seleccionar archivo.'}</p>
                {file && <p className="text-xs text-surface-400">{formatBytes(file.size)}</p>}
              </div>
            )}
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <Input label="Título." placeholder="Nombre del documento" value={form.title} onChange={(e) => set('title', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Tipo.</label>
            <select value={form.document_type} onChange={(e) => set('document_type', e.target.value)} className={selectCls}>
              {Object.entries(typeConfig).map(([val, cfg]) => <option key={val} value={val}>{cfg.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Estado.</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className={selectCls}>
              {Object.entries(statusConfig).map(([val, cfg]) => <option key={val} value={val}>{cfg.label}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-surface-700">Caso.</label>
          <select
            value={form.case_id}
            onChange={(e) => set('case_id', e.target.value)}
            className={selectCls}
            disabled={casesLoading}
          >
            <option value="">— Seleccionar caso —</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.case_number} — {c.title.length > 45 ? c.title.slice(0, 45) + '…' : c.title}
              </option>
            ))}
            {!casesLoading && cases.length === 0 && <option disabled>No hay casos disponibles</option>}
          </select>
        </div>
        <Input label="Etiquetas." placeholder="urgente, apelación, cliente-xyz (separadas por coma)" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
        <label className="flex items-center gap-3 rounded-lg border border-surface-200 p-3 cursor-pointer hover:bg-surface-50">
          <input type="checkbox" checked={form.is_confidential} onChange={(e) => set('is_confidential', e.target.checked)}
            className="h-4 w-4 rounded border-surface-300 text-primary-600" />
          <div>
            <p className="text-sm font-medium text-surface-700 flex items-center gap-1.5"><Shield className="h-4 w-4 text-red-500" /> Documento confidencial.</p>
            <p className="text-xs text-surface-400">Requiere permisos adicionales para acceder.</p>
          </div>
        </label>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}><Upload className="h-4 w-4" /> Subir Documento</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Documents() {
  const { user: authUser } = useAuth();
  const canManage = authUser?.user_type !== 'client';
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(null);
  const [newVersionDoc, setNewVersionDoc] = useState<DocType | null>(null);

  const fetchDocuments = async (q = '', type = '', status = '') => {
    setLoading(true);
    try {
      const res = await documentsApi.list(1, q);
      let filtered = Array.isArray(res?.results) ? res.results : [];
      if (type) filtered = filtered.filter(d => d.document_type === type);
      if (status) filtered = filtered.filter(d => d.status === status);
      setDocuments(filtered);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleSearch = (v: string) => { setSearch(v); fetchDocuments(v, filterType, filterStatus); };
  const handleFilterType = (v: string) => { setFilterType(v); fetchDocuments(search, v, filterStatus); };
  const handleFilterStatus = (v: string) => { setFilterStatus(v); fetchDocuments(search, filterType, v); };

  const handleDownload = async (doc: DocType, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const blob = await documentsApi.download(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = doc.original_filename; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Error al descargar.'); }
  };

  const statsData = [
    { label: 'Total', value: documents.length, icon: FileText, color: 'text-primary-600 bg-primary-50' },
    { label: 'Borradores', value: documents.filter(d => d.status === 'draft').length, icon: FilePen, color: 'text-surface-600 bg-surface-100' },
    { label: 'En revisión', value: documents.filter(d => d.status === 'review').length, icon: Eye, color: 'text-amber-600 bg-amber-50' },
    { label: 'Confidenciales', value: documents.filter(d => d.is_confidential).length, icon: Shield, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Documentos</h1>
          <p className="text-sm text-surface-500">Gestión documental con versionado completo y auditoría</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4" /> Subir Documento
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsData.map((s) => (
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

      {/* Tabla */}
      <Card padding={false}>
        <div className="flex flex-col gap-3 border-b border-surface-200 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input type="text" placeholder="Buscar documentos..." value={search} onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-surface-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div className="flex items-center gap-2">
            <select value={filterType} onChange={(e) => handleFilterType(e.target.value)}
              className="rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none">
              <option value="">Todos los tipos</option>
              {Object.entries(typeConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => handleFilterStatus(e.target.value)}
              className="rounded-lg border border-surface-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none">
              <option value="">Todos los estados</option>
              {Object.entries(statusConfig).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
            {(filterType || filterStatus) && (
              <button onClick={() => { setFilterType(''); setFilterStatus(''); fetchDocuments(search); }}
                className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-red-500 hover:bg-red-50">
                <X className="h-3.5 w-3.5" /> Limpiar
              </button>
            )}
            <button onClick={() => fetchDocuments(search, filterType, filterStatus)}
              className="rounded-lg p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-600">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-100" />)}</div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-surface-300" />
            <p className="text-sm text-surface-400">No hay documentos</p>
            <p className="mt-1 text-xs text-surface-300">{search || filterType || filterStatus ? 'Prueba con otros filtros' : 'Sube tu primer documento'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50">
                  {['Documento', 'Tipo', 'Estado', 'Versión', 'Tamaño', 'Fecha', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {documents.map((doc) => {
                  const st = statusConfig[doc.status] || statusConfig.draft;
                  return (
                    <tr key={doc.id} className="cursor-pointer transition-colors hover:bg-surface-50" onClick={() => setSelectedDoc(doc)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <DocTypeIcon type={doc.document_type} />
                          <div>
                            <p className="text-sm font-medium text-surface-900 flex items-center gap-1.5">
                              {doc.title}
                              {doc.is_confidential && <Shield className="h-3.5 w-3.5 text-red-400" />}
                            </p>
                            <p className="text-xs text-surface-400 truncate max-w-[180px]">{doc.original_filename}</p>
                            {doc.tags?.length > 0 && (
                              <div className="flex gap-1 mt-0.5">
                                {doc.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] rounded-full bg-surface-100 px-1.5 py-0.5 text-surface-500">
                                    <Tag className="h-2.5 w-2.5" />{tag}
                                  </span>
                                ))}
                                {doc.tags.length > 2 && <span className="text-[10px] text-surface-400">+{doc.tags.length - 2}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-600">{typeConfig[doc.document_type]?.label || doc.document_type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium`}>
                          <Badge variant={st.badge}>{st.label}</Badge>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                          <History className="h-3 w-3" /> v{doc.current_version}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-500">{formatBytes(doc.file_size)}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-surface-400"><Clock className="h-3 w-3" />{formatDate(doc.created_at)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <button onClick={(e) => { e.stopPropagation(); setNewVersionDoc(doc); }}
                              className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700" title="Nueva versión">
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={(e) => handleDownload(doc, e)}
                            className="rounded-lg p-1.5 text-surface-400 hover:bg-primary-50 hover:text-primary-600" title="Descargar">
                            <Download className="h-4 w-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedDoc(doc); }}
                            className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100" title="Ver detalle">
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => fetchDocuments()} />}
      {selectedDoc && (
        <DocumentDetailModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onNewVersion={() => { setNewVersionDoc(selectedDoc); setSelectedDoc(null); }}
          canManage={canManage}
        />
      )}
      {newVersionDoc && <NewVersionModal doc={newVersionDoc} onClose={() => setNewVersionDoc(null)} onSuccess={() => fetchDocuments()} />}
    </div>
  );
}
