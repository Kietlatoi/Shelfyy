import { lazy, Suspense } from 'react'
import { LandingPage } from './pages/LandingPage'

const AdminPage = lazy(() => import('./pages/AdminPage'))

export default function App() {
  if (window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')) {
    return <Suspense fallback={<main className="grid min-h-screen place-items-center">Đang tải trang quản trị…</main>}><AdminPage /></Suspense>
  }
  return <LandingPage />
}
