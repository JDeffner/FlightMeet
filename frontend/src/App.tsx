import './App.css'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { RequireAdmin } from '@/components/RequireAdmin'
import { HomePage } from '@/pages/home/HomePage'
import { WeatherPage } from '@/pages/WeatherPage'
import { LoginPage } from '@/pages/LoginPage'
import { AdminDashboardPage } from '@/pages/AdminDashboardPage'

// BASE_URL is '/public/' in production builds and '/' in dev (see vite.config.ts).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

// Gemeinsame Kopfzeile für die Auth-/Admin-Seiten. Die Marketing-Landingpage
// (FlightMeet) und /weather bleiben eigenständig mit ihrem eigenen Layout.
function AppChrome() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <Routes>
          {/* Eigenständige Seiten (eigenes Layout) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/weather" element={<WeatherPage />} />

          {/* Auth-/Admin-Bereich mit gemeinsamer Kopfzeile */}
          <Route element={<AppChrome />}>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin/dashboard"
              element={
                <RequireAdmin>
                  <AdminDashboardPage />
                </RequireAdmin>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
