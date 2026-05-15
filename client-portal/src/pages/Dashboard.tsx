import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { casesApi } from '../api/cases'
import type { CaseListItem } from '../types'

export default function Dashboard() {
  const [cases, setCases] = useState<CaseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await casesApi.list()
        if (!cancelled) setCases(data.results ?? [])
      } catch {
        if (!cancelled) setError('No se pudieron cargar los casos.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="text-surface-500">Cargando casos…</p>
  if (error) return <p className="text-red-600">{error}</p>

  if (cases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-surface-200 bg-white p-8 text-center text-surface-500">
        No hay casos asignados a tu cuenta.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Mis casos</h1>
        <p className="mt-1 text-sm text-surface-500">
          Consulta el estado de tus asuntos. Puedes escribir a tu abogado desde{' '}
          <Link to="/messages" className="text-primary-600 hover:underline">
            Mensajes
          </Link>
          .
        </p>
      </div>
      <ul className="space-y-3">
        {cases.map((c: CaseListItem) => (
          <li
            key={c.id}
            className="rounded-xl border border-surface-100 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-surface-900">{c.title}</p>
                <p className="text-sm text-surface-500">
                  Expediente {c.case_number} · {c.status_display ?? c.status}
                </p>
              </div>
              <Link
                to="/messages"
                state={{ caseId: c.id, lawyerId: c.assigned_lawyer_id }}
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                Escribir al abogado
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
