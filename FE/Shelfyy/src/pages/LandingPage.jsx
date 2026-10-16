import { useState } from 'react'
import { AnalyticsConsent } from '../components/AnalyticsConsent'
import { trackDownload } from '../analytics'
import { LandingExtension } from '../components/LandingExtension'
import { LandingFeatures } from '../components/LandingFeatures'
import { LandingFooter } from '../components/LandingFooter'
import { LandingHeader } from '../components/LandingHeader'
import { LandingHero } from '../components/LandingHero'
import { LandingAppNoticeModal } from '../components/LandingAppNoticeModal'
import { LandingHowItWorks } from '../components/LandingHowItWorks'
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
  const [isAppNoticeOpen, setIsAppNoticeOpen] = useState(false)
  const downloadUrl = import.meta.env.VITE_ANDROID_DOWNLOAD_URL?.trim()
  const handleDownload = () => {
    trackDownload(Boolean(downloadUrl?.startsWith('https://')))
    if (downloadUrl?.startsWith('https://')) window.location.assign(downloadUrl)
    else setIsAppNoticeOpen(true)
  }

  return (
    <div className="font-sans bg-white text-[#111827] overflow-x-hidden">
      <LandingHeader
        data={{ ...landingHeaderData, actions: ['Tải ứng dụng'] }}
        onDownloadClick={handleDownload}
      />
      <main>
        <LandingHero data={landingHeroData} />
        <LandingProblems items={landingProblems} />
        <LandingFeatures features={landingFeatures} />
        <LandingExtension data={landingExtensionData} />
        <LandingHowItWorks steps={landingSteps} />
      </main>
      <LandingFooter data={landingFooterData} />
      <AnalyticsConsent />

      {isAppNoticeOpen && (
        <LandingAppNoticeModal onClose={() => setIsAppNoticeOpen(false)} />
      )}


    </div>
  )
}
