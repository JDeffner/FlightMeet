import './App.css'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { NavIsland } from '@/components/chrome/NavIsland'
import { SiteFooter } from '@/components/chrome/SiteFooter'
import { RequireAdmin } from '@/components/RequireAdmin'
import { RequireAuth } from '@/components/RequireAuth'
import { HomePage } from '@/pages/home/HomePage'
import { WeatherPage } from '@/pages/WeatherPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { AdminDashboardPage } from '@/pages/AdminDashboardPage'
import { MeetsPage } from '@/pages/meets/MeetsPage'
import { MeetDetailPage } from '@/pages/meets/MeetDetailPage'
import { MeetCreatePage } from '@/pages/meets/MeetCreatePage'
import { GroupsPage } from '@/pages/groups/GroupsPage'
import { GroupDetailPage } from '@/pages/groups/GroupDetailPage'
import { ChatPage } from '@/pages/ChatPage'
import { ChatLauncher } from '@/components/chat/ChatLauncher'
import { MeetEditPage } from '@/pages/meets/MeetEditPage'
import { PilotProfilePage } from '@/pages/pilots/PilotProfilePage'

// BASE_URL is '/public/' in production builds and '/' in dev (see vite.config.ts).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

// Shared FlightMeet chrome (nav island + hills footer) for every app page. Only
// the marketing landing page ("/") keeps its own standalone layout. The nav is
// position:fixed, so main carries top padding to clear the floating pill.
function AppChrome() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <NavIsland />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-28 pb-16 sm:px-6">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <Routes>
          {/* Standalone marketing landing page (own layout) */}
          <Route path="/" element={<HomePage />} />

          {/* App pages sharing the FlightMeet chrome */}
          <Route element={<AppChrome />}>
            <Route path="/weather" element={<WeatherPage />} />
            <Route path="/meets" element={<MeetsPage />} />
            <Route path="/meets/:id" element={<MeetDetailPage />} />
            <Route
              path="/meets/new"
              element={
                <RequireAuth>
                  <MeetCreatePage />
                </RequireAuth>
              }
            />
            <Route
              path="/meets/:id/edit"
              element={
                <RequireAuth>
                  <MeetEditPage />
                </RequireAuth>
              }
            />
            <Route path="/pilots/:username" element={<PilotProfilePage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:id" element={<GroupDetailPage />} />
            <Route
              path="/chat"
              element={
                <RequireAuth>
                  <ChatPage />
                </RequireAuth>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
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

        {/* Floating chat bubble on every page (hides itself on /chat, /login,
            /register and when logged out). */}
        <ChatLauncher />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
