import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Scale, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'No se pudo iniciar sesión. Revisa tus datos.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-surface-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Scale className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-surface-900">Portal del cliente</h1>
          <p className="mt-1 text-sm text-surface-500">
            Accede con el usuario que te haya facilitado tu bufete
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="user" className="mb-1 block text-sm font-medium text-surface-700">
              Usuario
            </label>
            <input
              id="user"
              className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm outline-none focus:border-primary-600"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="pass" className="mb-1 block text-sm font-medium text-surface-700">
              Contraseña
            </label>
            <input
              id="pass"
              type="password"
              className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm outline-none focus:border-primary-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
