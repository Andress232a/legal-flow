import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Scale, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError('Credenciales incorrectas. Verifica tu usuario y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm shadow-lg">
            <Scale className="h-10 w-10 text-white" />
          </div>
          <h2 className="mb-4 text-4xl font-bold text-white">LegalFlow</h2>
          <p className="text-lg text-primary-200">
            Plataforma integral de gestión de procesos legales para bufetes de abogados
          </p>
          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            {[
              { value: 'IAM', label: 'Identidad y Acceso' },
              { value: 'Docs', label: 'Gestión Documental' },
              { value: 'RBAC', label: 'Control Granular' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-primary-300">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-4 flex items-center justify-center gap-2 lg:justify-start">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 lg:hidden">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-surface-900">Iniciar sesión</h1>
            </div>
            <p className="text-sm text-surface-500">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Usuario"
              type="text"
              placeholder="Ej: admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Iniciar sesión
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-surface-400">
            LegalFlow &copy; {new Date().getFullYear()} — Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
