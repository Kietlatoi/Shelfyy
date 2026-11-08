import { lazy, Suspense } from 'react'
import { LandingPage } from './pages/LandingPage'

const AdminPage = lazy(() => import('./pages/AdminPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const AccountDeletionPage = lazy(() => import('./pages/AccountDeletionPage'))

export default function App() {
  if (window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')) {
    return <Suspense fallback={<main className="grid min-h-screen place-items-center">Đang tải trang quản trị…</main>}><AdminPage /></Suspense>
  }
  if (window.location.pathname === '/privacy') {
    return <Suspense fallback={null}><PrivacyPage /></Suspense>
  }
  if (window.location.pathname === '/account-deletion') {
    return <Suspense fallback={null}><AccountDeletionPage /></Suspense>
  }
  return <LandingPage />
}
