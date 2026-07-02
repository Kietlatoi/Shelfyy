import { useState } from 'react'
import { login, register } from '../api/authApi'
import { LandingExtension } from '../components/LandingExtension'
import { LandingFeatures } from '../components/LandingFeatures'
import { LandingFooter } from '../components/LandingFooter'
import { LandingHeader } from '../components/LandingHeader'
import { LandingHero } from '../components/LandingHero'
import { LandingHowItWorks } from '../components/LandingHowItWorks'
import { LandingLoginModal } from '../components/LandingLoginModal'
import { LandingProblems } from '../components/LandingProblems'
import {
  landingExtensionData,
  landingFeatures,
  landingFooterData,
  landingHeaderData,
  landingHeroData,
  landingProblems,
  landingSteps,
} from '../const/landingData'

export function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Gọi BE thật cho cả đăng nhập và đăng ký.
  const handleLoginSubmit = async ({ mode = 'login', fullName, email, password, rememberMe }) => {
    setIsLoggingIn(true)
    setLoginError('')
    try {
      if (mode === 'register') {
        await register({ fullName, email, password })
      } else {
        await login({ email, password, rememberMe })
      }
      // saveAuth() đã được gọi bên trong authApi
      window.location.hash = '/home'
    } catch (err) {
      setLoginError(err.message || (mode === 'register' ? 'Đăng ký thất bại. Vui lòng thử lại.' : 'Đăng nhập thất bại. Vui lòng thử lại.'))
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="font-sans bg-white text-[#111827] overflow-x-hidden">
      <LandingHeader data={landingHeaderData} onLoginClick={() => { setLoginError(''); setIsLoginOpen(true) }} />
      <main>
        <LandingHero data={landingHeroData} />
        <LandingProblems items={landingProblems} />
        <LandingFeatures features={landingFeatures} />
        <LandingExtension data={landingExtensionData} />
        <LandingHowItWorks steps={landingSteps} />
      </main>
      <LandingFooter data={landingFooterData} />

      {isLoginOpen && (
        <LandingLoginModal
          onClose={() => { if (!isLoggingIn) setIsLoginOpen(false) }}
          onSubmit={handleLoginSubmit}
          isLoading={isLoggingIn}
          error={loginError}
        />
      )}
    </div>
  )
}
