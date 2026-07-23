import { useEffect, useState } from 'react'
import { pageContent } from '../api/apiClient'
import { toTrialOutfit, toWardrobeCard } from '../api/adapters'
import { dailyOutfitApi } from '../api/dailyOutfitApi'
import { trialApi } from '../api/trialApi'
import { wardrobeApi } from '../api/wardrobeApi'
import { MaterialIcon } from '../components/MaterialIcon'
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
const fallbackImage = '/image/wardrobe-tee.png'
const mainCategoryRank = {
  DRESS: 1,
  OUTERWEAR: 2,
  TOP: 3,
  BOTTOM: 4,
}

// FIX: BE trả "DONE" hoặc "COMPLETED" tuỳ path — normalize về 1 chuẩn
function isDone(status) {
  const s = String(status || '').toUpperCase()
  return s === 'DONE' || s === 'COMPLETED'
}

function isFailed(status) {
  return String(status || '').toUpperCase() === 'FAILED'
}

function itemCategory(item) {
  return String(item?.raw?.category || item?.category || '').toUpperCase()
}

function isTrialEligible(item) {
  return Boolean(mainCategoryRank[itemCategory(item)])
}

function pickMainItem(items) {
  return [...items].sort((left, right) => {
    const rankDiff = (mainCategoryRank[itemCategory(left)] || 99) - (mainCategoryRank[itemCategory(right)] || 99)
    if (rankDiff !== 0) return rankDiff
    const leftFavorite = left.raw?.favorite || left.favorite ? 1 : 0
    const rightFavorite = right.raw?.favorite || right.favorite ? 1 : 0
    return rightFavorite - leftFavorite
  })[0] || null
}

function toTrialItem(item, fallback = selectedOutfitData) {
  const raw = item?.raw || item
  if (!raw) return null
  const image = raw.thumbnailUrl || raw.imageUrl || raw.backgroundRemovedUrl || item?.image || fallback.image || fallbackImage
  return {
    ...toTrialOutfit(raw, fallback),
    image,
    category: raw.category || item?.category || '',
    itemId: raw.id || item?.id,
    raw,
  }
}

function createShowcaseFromBase(baseImageUrl, resultImageUrl = '') {
  return {
    ...trialShowcaseData,
    placeholder: {
      ...trialShowcaseData.placeholder,
      image: baseImageUrl || trialShowcaseData.placeholder.image,
      description: resultImageUrl
        ? 'Phiên thử đồ sẽ dùng ảnh kết quả mới nhất để thử món tiếp theo.'
        : trialShowcaseData.placeholder.description,
    },
    processing: {
      ...trialShowcaseData.processing,
      image: baseImageUrl || trialShowcaseData.processing.image,
    },
    result: {
      ...trialShowcaseData.result,
      image: resultImageUrl || baseImageUrl || trialShowcaseData.result.image,
    },
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Không đọc được ảnh đã chọn.'))
    reader.readAsDataURL(file)
  })
}

function formatDateTime(value) {
  if (!value) return 'Chưa rõ thời gian'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa rõ thời gian'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function StatusToast({ message, onClose }) {
  if (!message) return null
  return (
    <div
      aria-live="polite"
      className="fixed right-6 top-24 z-[80] flex w-[min(380px,calc(100vw-2rem))] items-start gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-primary shadow-lg shadow-primary/10"
      role="status"
    >
      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        <MaterialIcon name="check_circle" filled size={20} />
      </span>
      <span className="min-w-0 flex-1 pt-1">{message}</span>
      <button
        aria-label="Đóng thông báo"
        className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary"
        onClick={onClose}
        type="button"
      >
        <MaterialIcon name="close" size={18} />
      </button>
    </div>
  )
}

function TrialHistoryDrawer({
  error,
  isLoading,
  isOpen,
  items,
  onClose,
  onRefresh,
  onSavedOnlyChange,
  savedOnly,
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        aria-label="Đóng lịch sử thử đồ"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="Lịch sử thử đồ"
        className="absolute right-0 top-0 flex h-full w-[min(480px,100vw)] flex-col bg-surface-container-lowest shadow-2xl"
      >
        <header className="border-b border-border-subtle px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Try-on history</p>
              <h2 className="mt-1 text-2xl font-extrabold text-primary">Lịch sử thử đồ</h2>
            </div>
            <button
              aria-label="Đóng"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle bg-white text-primary transition hover:border-secondary hover:text-secondary"
              onClick={onClose}
              type="button"
            >
              <MaterialIcon name="close" size={20} />
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              aria-pressed={!savedOnly}
              className={`rounded-lg px-3 py-2 text-sm font-extrabold transition ${
                !savedOnly ? 'bg-primary text-white' : 'border border-border-subtle bg-white text-on-surface-variant'
              }`}
              onClick={() => onSavedOnlyChange(false)}
              type="button"
            >
              Tất cả
            </button>
            <button
              aria-pressed={savedOnly}
              className={`rounded-lg px-3 py-2 text-sm font-extrabold transition ${
                savedOnly ? 'bg-secondary text-white' : 'border border-border-subtle bg-white text-on-surface-variant'
              }`}
              onClick={() => onSavedOnlyChange(true)}
              type="button"
            >
              Đã lưu
            </button>
            <button
              className="ml-auto flex items-center gap-2 rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm font-extrabold text-primary transition hover:border-secondary hover:text-secondary"
              onClick={onRefresh}
              type="button"
            >
              <MaterialIcon name="refresh" size={18} />
              Tải lại
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600" role="alert">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="grid gap-3" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="h-32 animate-pulse rounded-lg bg-surface-container-low" key={index} />
              ))}
            </div>
          ) : items.length ? (
            <div className="grid gap-3">
              {items.map((item) => (
                <article className="grid grid-cols-[96px_1fr] gap-3 rounded-lg border border-border-subtle bg-white p-3" key={item.jobId}>
                  <div className="h-28 overflow-hidden rounded-lg bg-surface-container">
                    {item.resultImageUrl ? (
                      <img
                        alt="Kết quả thử đồ"
                        className="h-full w-full object-cover"
                        src={item.resultImageUrl}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                        <MaterialIcon name="image_not_supported" size={24} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-primary">
                          {item.clothingItem?.name || 'Kết quả thử đồ'}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                          {formatDateTime(item.completedAt || item.createdAt)}
                        </p>
                      </div>
                      {item.isSaved && (
                        <span className="inline-flex flex-none items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-extrabold text-emerald-700">
                          <MaterialIcon name="bookmark" filled size={14} />
                          Đã lưu
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-md bg-surface-container-low px-2 py-1 text-[11px] font-bold text-on-surface-variant">
                        {item.status}
                      </span>
                      {item.processingTimeMs != null && (
                        <span className="rounded-md bg-surface-container-low px-2 py-1 text-[11px] font-bold text-on-surface-variant">
                          {(item.processingTimeMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border-subtle bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-fixed text-secondary">
                <MaterialIcon name="history" size={24} />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-primary">
                {savedOnly ? 'Chưa có ảnh đã lưu' : 'Chưa có lịch sử thử đồ'}
              </h3>
              <p className="mt-2 text-sm font-semibold text-on-surface-variant">
                Kết quả try-on sẽ xuất hiện tại đây sau khi AI xử lý xong.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

export function TrialPage() {
  const nav = useTopNavUser()
  const [isUploaded, setIsUploaded] = useState(false)
  const [personFile, setPersonFile] = useState(null)
  const [personPreviewUrl, setPersonPreviewUrl] = useState('')
  const [view, setView] = useState('placeholder')
  const [sourceItems, setSourceItems] = useState([])
  const [eligibleItems, setEligibleItems] = useState([])
  const [sourceLabel, setSourceLabel] = useState('Tủ đồ của bạn')
  const [selectedOutfit, setSelectedOutfit] = useState(selectedOutfitData)
  const [showcase, setShowcase] = useState(trialShowcaseData)
  const [metrics, setMetrics] = useState(trialMetricsData)
  const [error, setError] = useState('')
  const [isLoadingWardrobe, setIsLoadingWardrobe] = useState(true)
  const [sessionBaseImageUrl, setSessionBaseImageUrl] = useState('')
  const [sessionStepCount, setSessionStepCount] = useState(0)
  const [sessionItems, setSessionItems] = useState([])
  const [currentResultJob, setCurrentResultJob] = useState(null)
  const [isSavingResult, setIsSavingResult] = useState(false)
  const [toast, setToast] = useState('')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyPage, setHistoryPage] = useState(null)
  const [historySavedOnly, setHistorySavedOnly] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadTrialItems() {
      setIsLoadingWardrobe(true)
      setError('')
      try {
        const [itemsPage, todayOutfit] = await Promise.all([
          wardrobeApi.getItems({ page: 0, size: 100 }),
          dailyOutfitApi.getToday().catch(() => null),
        ])
        if (cancelled) return

        const wardrobeCards = pageContent(itemsPage).map(toWardrobeCard)
        const todayCards = todayOutfit?.outfit?.items?.length
          ? todayOutfit.outfit.items.map((item) => toWardrobeCard(item))
          : []
        const initialSource = todayCards.length ? todayCards : wardrobeCards
        const initialEligible = initialSource.filter(isTrialEligible)
        const finalSource = initialEligible.length ? initialSource : wardrobeCards
        const finalEligible = initialEligible.length ? initialEligible : wardrobeCards.filter(isTrialEligible)
        const selected = pickMainItem(finalEligible)
        const trialItems = finalEligible.map((item) => toTrialItem(item)).filter(Boolean)

        setSourceItems(finalSource.map((item) => toTrialItem(item)).filter(Boolean))
        setEligibleItems(trialItems)
        setSourceLabel(todayCards.length && initialEligible.length ? 'Outfit hôm nay' : 'Tủ đồ của bạn')
        if (selected) {
          setSelectedOutfit(toTrialItem(selected))
        } else {
          setSelectedOutfit(selectedOutfitData)
          setError('Tủ đồ cần có áo, áo khoác, quần hoặc váy để dùng thử đồ AI.')
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Không tải được dữ liệu thử đồ.')
      } finally {
        if (!cancelled) setIsLoadingWardrobe(false)
      }
    }

    loadTrialItems()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (personPreviewUrl) URL.revokeObjectURL(personPreviewUrl)
    }
  }, [personPreviewUrl])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const companionItems = sourceItems.filter((item) => Number(item.itemId) !== Number(selectedOutfit.itemId))
  const activeBaseImageUrl = sessionBaseImageUrl || personPreviewUrl
  const historyItems = Array.isArray(historyPage?.content) ? historyPage.content : []

  const handleSelectMainItem = (item) => {
    setSelectedOutfit(item)
    setError('')
    if (sessionBaseImageUrl) {
      setView('result')
      setShowcase((current) => ({
        ...current,
        placeholder: {
          ...current.placeholder,
          image: sessionBaseImageUrl,
        },
        processing: {
          ...current.processing,
          image: sessionBaseImageUrl,
        },
        result: {
          ...current.result,
          image: sessionBaseImageUrl,
        },
      }))
      return
    }
    setView('placeholder')
    setMetrics(trialMetricsData)
    setShowcase(createShowcaseFromBase(personPreviewUrl))
  }

  const applyCompletedStatus = (status) => {
    const resultImageUrl = status.resultImageUrl
    const nextStepCount = sessionStepCount + 1
    const nextSessionItems = [
      ...sessionItems,
      {
        category: selectedOutfit.category || selectedOutfit.raw?.category || 'ITEM',
        id: selectedOutfit.itemId,
        title: selectedOutfit.title || 'Món chính',
      },
    ]

    if (resultImageUrl) {
      setSessionBaseImageUrl(resultImageUrl)
      setSessionStepCount(nextStepCount)
      setSessionItems(nextSessionItems)
      setCurrentResultJob({
        completedAt: status.completedAt || null,
        isSaved: Boolean(status.isSaved),
        jobId: status.jobId,
        resultImageUrl,
        savedAt: status.savedAt || null,
      })
    }

    setShowcase((current) => ({
      ...current,
      placeholder: {
        ...current.placeholder,
        image: resultImageUrl || current.placeholder.image,
        description: resultImageUrl
          ? 'Phiên thử đồ sẽ dùng ảnh kết quả mới nhất để thử món tiếp theo.'
          : current.placeholder.description,
      },
      processing: {
        ...current.processing,
        image: resultImageUrl || current.processing.image,
      },
      result: {
        ...current.result,
        image: resultImageUrl || current.result.image,
        badge: nextStepCount > 1 ? `Đã thử ${nextStepCount} món` : 'AI Generation Complete',
      },
    }))
    setMetrics({
      ...trialMetricsData,
      metrics: [
        { label: 'Món mới nhất', value: selectedOutfit.title || '1 món chính' },
        {
          label: 'Thời gian tạo',
          value: status.processingTimeMs
            ? `${(status.processingTimeMs / 1000).toFixed(1)}s`
            : '-',
        },
      ],
    })
  }

  const handleUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh hợp lệ.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ảnh tối đa 10MB.')
      return
    }

    setPersonFile(file)
    setIsUploaded(true)
    setError('')
    setView('placeholder')
    setSessionBaseImageUrl('')
    setSessionStepCount(0)
    setSessionItems([])
    setCurrentResultJob(null)
    setMetrics(trialMetricsData)
    const nextPreview = URL.createObjectURL(file)
    setPersonPreviewUrl(nextPreview)
    setShowcase(createShowcaseFromBase(nextPreview))
  }

  const handleResetSession = () => {
    setSessionBaseImageUrl('')
    setSessionStepCount(0)
    setSessionItems([])
    setCurrentResultJob(null)
    setError('')
    setView('placeholder')
    setMetrics(trialMetricsData)
    setShowcase(createShowcaseFromBase(personPreviewUrl))
  }

  const pollJobStatus = async (jobId) => {
    // Poll tối đa 45 lần x 2s = 90 giây timeout cho job Replicate.
    for (let i = 0; i < 45; i += 1) {
      const status = await trialApi.getStatus(jobId)

      if (isDone(status?.status)) {
        applyCompletedStatus(status)
        return 'DONE'
      }

      if (isFailed(status?.status)) {
        throw new Error(status.errorMessage || 'AI try-on thất bại. Vui lòng thử lại.')
      }

      await sleep(2000)
    }

    // Timeout sau 90s — vẫn để processing, không throw
    return 'PROCESSING'
  }

  const handleGenerate = async () => {
    if (!personFile && !activeBaseImageUrl) {
      window.alert(trialActionData.alert)
      return
    }
    if (!selectedOutfit.itemId) {
      setError('Bạn cần chọn một món chính để thử AI.')
      return
    }

    setView('processing')
    setError('')
    if (!sessionBaseImageUrl) {
      setCurrentResultJob(null)
    }
    setShowcase((current) => ({
      ...current,
      processing: {
        ...current.processing,
        image: activeBaseImageUrl || current.processing.image,
      },
    }))

    try {
      const basePayload = sessionBaseImageUrl
        ? { personImageUrl: sessionBaseImageUrl }
        : { personImageDataUrl: await readFileAsDataUrl(personFile) }

      const job = await trialApi.generate({
        ...basePayload,
        clothingItemId: selectedOutfit.itemId,
      })

      if (isDone(job?.status)) {
        applyCompletedStatus(job)
        setView('result')
        return
      }

      const finalStatus = await pollJobStatus(job.jobId)
      setView(finalStatus === 'DONE' ? 'result' : 'processing')
    } catch (err) {
      setView(sessionBaseImageUrl ? 'result' : 'placeholder')
      setError(err.message || 'Không tạo được ảnh thử đồ')
    }
  }

  const loadTrialHistory = async (savedOnly = historySavedOnly) => {
    setIsHistoryLoading(true)
    setHistoryError('')
    try {
      const data = await trialApi.getHistory({
        page: 0,
        saved: savedOnly ? true : undefined,
        size: 12,
      })
      setHistoryPage(data)
    } catch (err) {
      setHistoryError(err.message || 'Không tải được lịch sử thử đồ.')
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const handleOpenHistory = () => {
    setIsHistoryOpen(true)
    loadTrialHistory(historySavedOnly)
  }

  const handleHistorySavedOnlyChange = (nextSavedOnly) => {
    setHistorySavedOnly(nextSavedOnly)
    loadTrialHistory(nextSavedOnly)
  }

  const handleSaveResult = async () => {
    if (!currentResultJob?.jobId) {
      setError('Chưa có ảnh kết quả để lưu.')
      return
    }
    if (currentResultJob.isSaved) return

    setIsSavingResult(true)
    setError('')
    try {
      const saved = await trialApi.setSaved(currentResultJob.jobId, true)
      setCurrentResultJob((current) => ({
        ...current,
        completedAt: saved.completedAt || current?.completedAt || null,
        isSaved: true,
        jobId: saved.jobId || current?.jobId,
        resultImageUrl: saved.resultImageUrl || current?.resultImageUrl,
        savedAt: saved.savedAt || current?.savedAt || null,
      }))
      setShowcase((current) => ({
        ...current,
        result: {
          ...current.result,
          badge: 'Đã lưu kết quả',
          image: saved.resultImageUrl || current.result.image,
        },
      }))
      setHistoryPage((current) => {
        if (!current?.content) return current
        return {
          ...current,
          content: current.content.map((item) => (
            Number(item.jobId) === Number(saved.jobId) ? saved : item
          )),
        }
      })
      setToast('Đã lưu ảnh thử đồ.')
      if (isHistoryOpen) {
        loadTrialHistory(historySavedOnly)
      }
    } catch (err) {
      setError(err.message || 'Không lưu được ảnh thử đồ.')
    } finally {
      setIsSavingResult(false)
    }
  }

  const handleNotify = () => {
    window.alert(topNavData.notificationMessage)
  }

  return (
    <>
      <StatusToast message={toast} onClose={() => setToast('')} />
      <TopNav data={nav} onNotify={handleNotify} />
      <TrialHistoryDrawer
        error={historyError}
        isLoading={isHistoryLoading}
        isOpen={isHistoryOpen}
        items={historyItems}
        onClose={() => setIsHistoryOpen(false)}
        onRefresh={() => loadTrialHistory(historySavedOnly)}
        onSavedOnlyChange={handleHistorySavedOnlyChange}
        savedOnly={historySavedOnly}
      />
      <main className="pt-24 pb-12 px-margin-desktop max-w-container-max mx-auto h-full min-h-screen">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}
        {isLoadingWardrobe && (
          <div className="mb-4 rounded-xl border border-border-subtle bg-white px-4 py-3 text-sm font-semibold text-on-surface-variant">
            Đang tải tủ đồ cho try-on...
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
          <LoadingComponent delay={500} className="md:col-span-4">
            <TrialControlsPanel
              action={trialActionData}
              companionItems={companionItems}
              eligibleItems={eligibleItems}
              isUploaded={isUploaded}
              onGenerate={handleGenerate}
              onResetSession={handleResetSession}
              onSelectMainItem={handleSelectMainItem}
              onUpload={handleUpload}
              outfit={selectedOutfit}
              personPreviewUrl={personPreviewUrl}
              session={{
                baseImageUrl: sessionBaseImageUrl,
                items: sessionItems,
                stepCount: sessionStepCount,
              }}
              sourceLabel={sourceLabel}
              tip={trialTipData}
              upload={uploadData}
              isGenerating={view === 'processing'}
            />
          </LoadingComponent>

          <LoadingComponent delay={750} className="md:col-span-8">
            <TrialShowcase
              isResultSaved={Boolean(currentResultJob?.isSaved)}
              isSavingResult={isSavingResult}
              metrics={metrics}
              onOpenHistory={handleOpenHistory}
              onSaveResult={handleSaveResult}
              showcase={showcase}
              view={view}
            />
          </LoadingComponent>
        </div>
      </main>
    </>
  )
}
