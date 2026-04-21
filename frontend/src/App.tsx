import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Permissions from './pages/Permissions';
import Documents from './pages/Documents';
import Cases from './pages/Cases';
import TimeTracking from './pages/TimeTracking';
import Billing from './pages/Billing';
import Calendar from './pages/Calendar';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/billing" element={<Billing />} />

            {/* Solo admin, abogado y asistente */}
            <Route path="/time-tracking" element={
              <RoleRoute allowed={['admin', 'lawyer', 'assistant']}>
                <TimeTracking />
              </RoleRoute>
            } />
            <Route path="/calendar" element={
              <RoleRoute allowed={['admin', 'lawyer', 'assistant']}>
                <Calendar />
              </RoleRoute>
            } />

            {/* Solo admin */}
            <Route path="/users" element={
              <RoleRoute allowed={['admin']}>
                <Users />
              </RoleRoute>
            } />
            <Route path="/roles" element={
              <RoleRoute allowed={['admin']}>
                <Roles />
              </RoleRoute>
            } />
            <Route path="/permissions" element={
              <RoleRoute allowed={['admin']}>
                <Permissions />
              </RoleRoute>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
