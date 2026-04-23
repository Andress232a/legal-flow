import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { messagesApi } from '../api/messages'
import type { PortalMessage } from '../types'

interface LocationState {
  caseId?: string
  lawyerId?: string
}

export default function Messages() {
  const location = useLocation()
  const state = (location.state ?? {}) as LocationState

  const [items, setItems] = useState<PortalMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [caseId, setCaseId] = useState(state.caseId ?? '')
  const [recipientId, setRecipientId] = useState(state.lawyerId ?? '')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const data = await messagesApi.list()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setError('No se pudieron cargar los mensajes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!caseId || !recipientId || !body.trim()) {
      setError('Indica caso, destinatario y mensaje.')
      return
    }
    setSending(true)
    try {
      await messagesApi.create({
        case_id: caseId,
        recipient_id: recipientId,
        body: body.trim(),
      })
      setBody('')
      await load()
    } catch {
      setError('No se pudo enviar el mensaje. Comprueba permisos y datos.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p className="text-surface-500">Cargando…</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Mensajes con el bufete</h1>
        <p className="mt-1 text-sm text-surface-500">
          Los mensajes quedan vinculados a un caso. Usa «Escribir al abogado» desde un caso para
          rellenar automáticamente los datos.
        </p>
      </div>

      <form onSubmit={send} className="space-y-3 rounded-xl border border-surface-100 bg-white p-4">
        <p className="text-sm font-medium text-surface-800">Nuevo mensaje</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-surface-500">ID del caso (UUID)</label>
            <input
              className="w-full rounded border border-surface-200 px-2 py-1.5 text-sm"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="uuid del caso"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-surface-500">ID del abogado (UUID)</label>
            <input
              className="w-full rounded border border-surface-200 px-2 py-1.5 text-sm"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder="uuid del destinatario"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-surface-500">Mensaje</label>
          <textarea
            className="w-full rounded border border-surface-200 px-2 py-1.5 text-sm"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-900">Historial</h2>
        {items.length === 0 ? (
          <p className="text-sm text-surface-500">Aún no hay mensajes.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-surface-100 bg-white p-3 text-sm shadow-sm"
              >
                <p className="text-xs text-surface-500">
                  Caso {m.case_id.slice(0, 8)}… · {new Date(m.created_at).toLocaleString()}
                </p>
                <p className="mt-1 text-surface-800">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
