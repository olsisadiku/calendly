import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { useProfile } from './hooks/useProfile'
import { supabase } from './lib/supabase'
import { ToastContainer } from './components/ui/Toast'
import { Spinner } from './components/ui/Spinner'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RoleSelectionPage } from './pages/RoleSelectionPage'
import { DashboardPage } from './pages/DashboardPage'
import { AvailabilityPage } from './pages/AvailabilityPage'
import { SchedulePage } from './pages/SchedulePage'
import { AdminPage } from './pages/AdminPage'

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      navigate('/dashboard', { replace: true })
    })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const { hasRole } = useProfile()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!hasRole) {
    return <Navigate to="/role-selection" replace />
  }

  return <>{children}</>
}

function RoleGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const { hasRole } = useProfile()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (hasRole) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isSuperuser } = useProfile()
  if (!isSuperuser) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function TeacherGuard({ children }: { children: React.ReactNode }) {
  const { isTeacher, isSuperuser } = useProfile()
  if (!isTeacher && !isSuperuser) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function StudentGuard({ children }: { children: React.ReactNode }) {
  const { isStudent, isSuperuser } = useProfile()
  if (!isStudent && !isSuperuser) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/role-selection"
        element={
          <RoleGuard>
            <RoleSelectionPage />
          </RoleGuard>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/availability"
          element={
            <TeacherGuard>
              <AvailabilityPage />
            </TeacherGuard>
          }
        />
        <Route
          path="/schedule"
          element={
            <StudentGuard>
              <SchedulePage />
            </StudentGuard>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <ToastContainer />
        </AuthProvider>
      </BrowserRouter>
    </LanguageProvider>
  )
}
