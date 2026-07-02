import { useEffect, useState } from 'react'
import { homeApi } from '../api/homeApi'
import { toSuggestData } from '../api/adapters'
import { Sidebar } from '../components/Sidebar'
import { SuggestHero } from '../components/SuggestHero'
import { SuggestInsights } from '../components/SuggestInsights'
import { SuggestOutfitCarousel } from '../components/SuggestOutfitCarousel'
import { TopNav } from '../components/TopNav'
import { LoadingComponent } from '../components/LoadingComponent'
import { sidebarData, topNavData } from '../const/homeData'
import {
  aiInsightData,
  outfitSuggestionsData,
  suggestHeroData,
  trendData,
} from '../const/suggestData'

function getBrowserLocation() {
  if (!navigator.geolocation) return Promise.resolve({})
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: false, timeout: 2500, maximumAge: 300000 }
    )
  })
}

export function SuggestPage() {
  const [hero, setHero] = useState(suggestHeroData)
  const [carousel, setCarousel] = useState(outfitSuggestionsData)
  const [insight, setInsight] = useState(aiInsightData)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadSuggest() {
      try {
        const location = await getBrowserLocation()
        const home = await homeApi.getHome(location)
        if (ignore) return

        // FIX: dùng adapter toSuggestData để map data BE → FE
        const mapped = toSuggestData(home, suggestHeroData, outfitSuggestionsData, aiInsightData)
        setHero(mapped.hero)
        setCarousel(mapped.carousel)
        setInsight(mapped.insight)
        setError('')
      } catch (err) {
        if (!ignore) setError(err.message || 'Không tải được gợi ý trang phục')
      }
    }

    loadSuggest()
    return () => { ignore = true }
  }, [])

  const handleNotify = () => {
    window.alert(topNavData.notificationMessage)
  }

  return (
    <>
      <Sidebar activeKey="suggestions" data={sidebarData} />
      <TopNav data={topNavData} onNotify={handleNotify} />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="max-w-container-max mx-auto py-12 px-margin-desktop space-y-8">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <LoadingComponent delay={400}>
            <SuggestHero data={hero} />
          </LoadingComponent>

          <LoadingComponent delay={600}>
            <SuggestOutfitCarousel data={carousel} />
          </LoadingComponent>

          <LoadingComponent delay={800}>
            <SuggestInsights insight={insight} trends={trendData} />
          </LoadingComponent>
        </div>
      </main>
    </>
  )
}
