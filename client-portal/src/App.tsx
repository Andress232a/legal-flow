import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { LogOut, MessageSquare, Briefcase } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Messages from './pages/Messages'

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const nav = [
    { to: '/', label: 'Mis casos', icon: Briefcase },
    { to: '/messages', label: 'Mensajes', icon: MessageSquare },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-surface-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-primary-800">
            LegalFlow · Portal cliente
          </Link>
          <nav className="flex items-center gap-4">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 text-sm ${
                  location.pathname === to ? 'font-medium text-primary-700' : 'text-surface-500'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm text-surface-600">
            <span>
              {user?.first_name} {user?.last_name}
            </span>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-surface-500 hover:bg-surface-100"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell>
              <Dashboard />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Shell>
              <Messages />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
