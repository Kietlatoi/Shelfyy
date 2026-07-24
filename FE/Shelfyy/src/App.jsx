import { useEffect, useState } from 'react'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { AdminPage } from './pages/AdminPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { HomePage } from './pages/HomePage'
import { LandingPage } from './pages/LandingPage'
import { PremiumPage } from './pages/PremiumPage'
import { ProfilePage } from './pages/ProfilePage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SuggestPage } from './pages/SuggestPage'
import { TrialPage } from './pages/TrialPage'
import { WardrobePage } from './pages/WardrobePage'
import { WearHistoryPage } from './pages/WearHistoryPage'
import { LoadingPage } from './components/LoadingPage'

function getRouteFromHash() {
  const raw = window.location.hash.replace(/^#/, '') || window.location.pathname || '/'
  // Bỏ phần query string (?payment=success&plan=PRO...) khi so khớp route —
  // nếu không, hash dạng "#/up-premium?payment=success" sẽ không khớp với
  // bất kỳ route nào bên dưới (so sánh strict equality) và rơi về LandingPage.
  const [path] = raw.split('?')
  return path || '/'
}

function App() {
  const [route, setRoute] = useState(getRouteFromHash)
  const [isPageLoading, setIsPageLoading] = useState(false)

  useEffect(() => {
    const handleHashChange = () => {
      setIsPageLoading(true)
      const timer = setTimeout(() => {
        setRoute(getRouteFromHash())
        setIsPageLoading(false)
      }, 300)
      return () => clearTimeout(timer)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const renderRoute = () => {
    if (route === '/' || route === '') {
      return <LandingPage />
    }

    if (route === '/forgot-password') {
      return <ForgotPasswordPage />
    }

    if (route.startsWith('/reset-password')) {
      return <ResetPasswordPage />
    }

    if (route === '/home') {
      return <HomePage />
    }

    if (route === '/admin') {
      return <AdminPage />
    }

    if (route === '/wardrobe') {
      return <WardrobePage />
    }

    if (route === '/wear-history') {
      return <WearHistoryPage />
    }

    if (route === '/favorites') {
      return <FavoritesPage />
    }

    if (route === '/profile') {
      return <ProfilePage />
    }

    if (route === '/trial') {
      return <TrialPage />
    }

    if (route === '/suggest' || route === '/suggestions') {
      return <SuggestPage />
    }

    if (route === '/up-prenium' || route === '/up-premium') {
      return <PremiumPage />
    }

    return <LandingPage />
  }

  return (
    <>
      {isPageLoading && <LoadingPage />}
      <div className={isPageLoading ? 'opacity-50 pointer-events-none' : 'transition-opacity duration-300'}>
        {renderRoute()}
      </div>
    </>
  )
}

export default App
