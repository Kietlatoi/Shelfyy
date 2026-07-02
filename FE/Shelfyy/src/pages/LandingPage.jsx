import { useState } from 'react'
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

  const handleLoginSubmit = (event) => {
    event.preventDefault()
    setIsLoggingIn(true)
    setTimeout(() => {
      setIsLoggingIn(false)
      window.location.hash = '/home'
    }, 1500)
  }

  return (
    <div className="font-sans bg-white text-[#111827] overflow-x-hidden">
      <LandingHeader data={landingHeaderData} onLoginClick={() => setIsLoginOpen(true)} />
      <main>
        <LandingHero data={landingHeroData} />
        <LandingProblems items={landingProblems} />
        <LandingFeatures features={landingFeatures} />
        <LandingExtension data={landingExtensionData} />
        <LandingHowItWorks steps={landingSteps} />
      </main>
      <LandingFooter data={landingFooterData} />
      {isLoginOpen && (
        <LandingLoginModal onClose={() => setIsLoginOpen(false)} onSubmit={handleLoginSubmit} isLoading={isLoggingIn} />
      )}
    </div>
  )
}
