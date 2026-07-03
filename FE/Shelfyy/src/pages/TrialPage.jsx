import { useEffect, useRef, useState } from 'react'
import { pageContent } from '../api/apiClient'
import { toTrialOutfit } from '../api/adapters'
import { trialApi } from '../api/trialApi'
import { uploadApi } from '../api/uploadApi'
import { wardrobeApi } from '../api/wardrobeApi'
import { TrialControlsPanel } from '../components/TrialControlsPanel'
import { TrialShowcase } from '../components/TrialShowcase'
import { LoadingComponent } from '../components/LoadingComponent'
import {
  selectedOutfitData,
  trialActionData,
  trialMetricsData,
  trialShowcaseData,
  trialTipData,
  uploadData,
} from '../const/trialData'
import { TopNav } from '../components/TopNav'
import { topNavData } from '../const/homeData'
import { useTopNavUser } from '../hooks/useTopNavUser'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// FIX: BE trả "DONE" hoặc "COMPLETED" tuỳ path — normalize về 1 chuẩn
function isDone(status) {
  const s = String(status || '').toUpperCase()
  return s === 'DONE' || s === 'COMPLETED'
}

function isFailed(status) {
  return String(status || '').toUpperCase() === 'FAILED'
}

export function TrialPage() {
  const nav = useTopNavUser()
  const [isUploaded, setIsUploaded] = useState(false)
  const [personFile, setPersonFile] = useState(null)
  const [view, setView] = useState('placeholder')
  const [selectedOutfit, setSelectedOutfit] = useState(selectedOutfitData)
  const [showcase, setShowcase] = useState(trialShowcaseData)
  const [metrics, setMetrics] = useState(trialMetricsData)
  const [error, setError] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    wardrobeApi.getItems({ page: 0, size: 1 })
      .then((itemsPage) => {
        const first = pageContent(itemsPage)[0]
        setSelectedOutfit(toTrialOutfit(first, selectedOutfitData))
      })
      .catch(() => {})

    return () => window.clearTimeout(timerRef.current)
  }, [])

  const handleUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPersonFile(file)
    setIsUploaded(true)
    setError('')
  }

  const pollJobStatus = async (jobId) => {
    // Poll tối đa 30 lần × 2s = 60 giây timeout
    for (let i = 0; i < 30; i += 1) {
      const status = await trialApi.getStatus(jobId)

      // FIX: BE getStatus trả status là "DONE", pollPendingJobs set "COMPLETED"
      // → normalize cả hai
      if (isDone(status?.status)) {
        setShowcase((current) => ({
          ...current,
          result: {
            ...current.result,
            image: status.resultImageUrl || current.result.image,
            badge: 'AI Generation Complete',
          },
        }))
        setMetrics({
          ...trialMetricsData,
          metrics: [
            { label: 'Độ chính xác AI', value: status.accuracy || '-' },
            {
              label: 'Thời gian tạo',
              value: status.processingTimeMs
                ? `${(status.processingTimeMs / 1000).toFixed(1)}s`
                : '-',
            },
          ],
        })
        return 'DONE'
      }

      if (isFailed(status?.status)) {
        throw new Error('AI try-on thất bại. Vui lòng thử lại.')
      }

      await sleep(2000)
    }

    // Timeout sau 60s — vẫn để processing, không throw
    return 'PROCESSING'
  }

  const handleGenerate = async () => {
    if (!personFile) {
      window.alert(trialActionData.alert)
      return
    }
    if (!selectedOutfit.itemId) {
      setError('Bạn cần có ít nhất 1 món đồ trong tủ đồ để thử AI.')
      return
    }

    setView('processing')
    setError('')
    window.clearTimeout(timerRef.current)

    try {
      // Bước 1: upload ảnh người dùng lên Cloudinary
      const uploadResult = await uploadApi.uploadAvatar(personFile)

      // Bước 2: gọi BE tạo try-on job
      const job = await trialApi.generate({
        personImageUrl: uploadResult?.originalUrl,
        clothingItemId: selectedOutfit.itemId,
      })

      // Bước 3: poll trạng thái
      const finalStatus = await pollJobStatus(job.jobId)
      setView(finalStatus === 'DONE' ? 'result' : 'processing')
    } catch (err) {
      setView('placeholder')
      setError(err.message || 'Không tạo được ảnh thử đồ')
    }
  }

  const handleNotify = () => {
    window.alert(topNavData.notificationMessage)
  }

  return (
    <>
      <TopNav data={nav} onNotify={handleNotify} />
      <main className="pt-24 pb-12 px-margin-desktop max-w-container-max mx-auto h-full min-h-screen">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
          <LoadingComponent delay={500} className="md:col-span-4">
            <TrialControlsPanel
              action={trialActionData}
              isUploaded={isUploaded}
              onGenerate={handleGenerate}
              onUpload={handleUpload}
              outfit={selectedOutfit}
              tip={trialTipData}
              upload={uploadData}
              isGenerating={view === 'processing'}
            />
          </LoadingComponent>

          <LoadingComponent delay={750} className="md:col-span-8">
            <TrialShowcase
              metrics={metrics}
              showcase={showcase}
              view={view}
            />
          </LoadingComponent>
        </div>
      </main>
    </>
  )
}
