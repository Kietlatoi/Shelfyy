import { useEffect, useState } from 'react'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { LandingPage } from './pages/LandingPage'
import { PremiumPage } from './pages/PremiumPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SuggestPage } from './pages/SuggestPage'
import { TrialPage } from './pages/TrialPage'
import { WardrobePage } from './pages/WardrobePage'
import { LoadingPage } from './components/LoadingPage'

function getRouteFromHash() {
  return window.location.hash.replace(/^#/, '') || window.location.pathname || '/'
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

    if (route === '/wardrobe') {
      return <WardrobePage />
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
