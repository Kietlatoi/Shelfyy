import { MaterialIcon } from './MaterialIcon'
import { LoadingButton } from './LoadingButton'

const emptyList = []

function ItemOption({ disabled = false, isSelected, item, onSelect }) {
  const raw = item?.raw || item || {}
  return (
    <button
      aria-pressed={isSelected}
      className={`flex min-h-[74px] w-full items-center gap-3 rounded-lg border p-2 text-left transition-all ${
        isSelected
          ? 'border-secondary bg-secondary/5 ring-2 ring-secondary/10'
          : 'border-border-subtle bg-white hover:border-secondary/40 hover:bg-surface-container-lowest'
      } disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border-subtle`}
      disabled={disabled}
      onClick={() => onSelect(item)}
      type="button"
    >
      <img
        alt={item.title}
        className="h-14 w-14 flex-none rounded-md bg-surface-container object-cover"
        src={item.image}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-extrabold uppercase tracking-wide text-secondary">
          {raw.category || item.category || 'ITEM'}
        </span>
        <span className="mt-0.5 block truncate text-sm font-extrabold text-primary">
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-on-surface-variant">
          {item.description}
        </span>
      </span>
      <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-md ${
        isSelected ? 'bg-secondary text-white' : 'bg-surface-container text-on-surface-variant'
      }`}>
        <MaterialIcon name={isSelected ? 'check' : 'chevron_right'} className="text-[18px]" />
      </span>
    </button>
  )
}

function CompanionItems({ items }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-border-subtle bg-surface-container-low p-4 text-sm font-semibold text-on-surface-variant">
        Chưa có món phối kèm trong outfit hiện tại.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 4).map((item) => (
        <div
          className="flex items-center gap-3 rounded-lg border border-border-subtle bg-white p-2"
          key={item.itemId || item.id}
        >
          <img
            alt={item.title}
            className="h-12 w-12 flex-none rounded-md bg-surface-container object-cover"
            src={item.image}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-primary">{item.title}</p>
            <p className="truncate text-xs font-semibold text-on-surface-variant">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function TrialSessionStatus({ isGenerating, onResetSession, session }) {
  if (!session?.stepCount) return null

  return (
    <section className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">
            Phiên thử đồ
          </p>
          <h3 className="mt-1 text-base font-extrabold text-primary">
            Đang thử nối tiếp
          </h3>
          <p className="mt-1 text-sm font-semibold text-on-surface-variant">
            {session.stepCount} món đã được áp dụng lên ảnh hiện tại.
          </p>
        </div>
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-white text-secondary shadow-sm">
          <MaterialIcon name="dynamic_feed" className="text-[22px]" />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {session.items.slice(-3).map((item, index) => (
          <div
            className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
            key={`${item.id || item.title}-${index}`}
          >
            <span className="min-w-0 truncate font-bold text-primary">{item.title}</span>
            <span className="flex-none text-xs font-extrabold uppercase tracking-wide text-secondary">
              {item.category}
            </span>
          </div>
        ))}
      </div>

      <button
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm font-extrabold text-primary transition-colors hover:border-secondary/40 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isGenerating}
        onClick={onResetSession}
        type="button"
      >
        <MaterialIcon name="restart_alt" className="text-[18px]" />
        Quay về ảnh gốc
      </button>
    </section>
  )
}

export function TrialControlsPanel({
  action,
  companionItems = emptyList,
  eligibleItems = emptyList,
  isUploaded,
  onSelectMainItem = () => {},
  onGenerate,
  onResetSession,
  onUpload,
  outfit,
  personPreviewUrl = '',
  session,
  sourceLabel = 'Tủ đồ của bạn',
  tip,
  upload,
  isGenerating = false,
}) {
  return (
    <div className="md:col-span-4 space-y-6 w-full">
      <section className="bg-surface-container-lowest border border-border-subtle rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-subtle flex justify-between items-center">
          <div>
            <p className="font-label-sm text-label-sm text-secondary uppercase tracking-widest">
              {sourceLabel}
            </p>
            <h2 className="font-label-md text-label-md text-primary uppercase tracking-tight">
              {outfit.header}
            </h2>
          </div>
          <MaterialIcon name="checkroom" className="text-secondary text-[22px]" />
        </div>
        <div className="aspect-[3/4] relative group">
          <img className="w-full h-full object-cover" src={outfit.image} alt={outfit.title} />
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="p-4 bg-surface-container-low">
          <div className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-primary">{outfit.title}</span>
            <span className="font-label-sm text-label-sm text-text-muted">{outfit.description}</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border-subtle bg-surface-container-lowest p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">
              Chọn món chính
            </p>
            <h3 className="mt-1 text-base font-extrabold text-primary">Thử đồ theo phiên</h3>
          </div>
          <span className="rounded-md bg-surface-container px-2.5 py-1 text-xs font-bold text-on-surface-variant">
            {eligibleItems.length} món
          </span>
        </div>

        {eligibleItems.length ? (
          <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {eligibleItems.map((item) => (
              <ItemOption
                isSelected={Number(item.itemId) === Number(outfit.itemId)}
                disabled={isGenerating}
                item={item}
                key={item.itemId}
                onSelect={onSelectMainItem}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border-subtle bg-surface-container-low p-4 text-sm font-semibold text-on-surface-variant">
            Tủ đồ cần có áo, áo khoác, quần hoặc váy để dùng thử đồ AI.
          </div>
        )}
      </section>

      <TrialSessionStatus
        isGenerating={isGenerating}
        onResetSession={onResetSession}
        session={session}
      />

      <label
        className={`bg-surface-container-lowest border-2 ${
          isUploaded ? 'border-solid bg-secondary/5 border-secondary' : 'border-dashed border-outline-variant'
        } rounded-xl p-8 text-center transition-all hover:border-secondary group cursor-pointer relative overflow-hidden block ${
          isGenerating ? 'pointer-events-none opacity-70' : ''
        }`}
      >
        <input
          accept="image/jpeg,image/png,image/webp"
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          disabled={isGenerating}
          onChange={onUpload}
          type="file"
        />
        <div className="flex flex-col items-center gap-4 py-4">
          {personPreviewUrl ? (
            <img
              alt="Ảnh người dùng"
              className="h-24 w-20 rounded-lg border border-border-subtle object-cover"
              src={personPreviewUrl}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-secondary-fixed transition-colors">
              <MaterialIcon
                name="upload_file"
                className="text-on-surface-variant group-hover:text-secondary text-[32px]"
              />
            </div>
          )}
          <div className="space-y-1">
            <p className="font-label-md text-label-md text-primary">
              {isUploaded ? upload.uploadedTitle : upload.defaultTitle}
            </p>
            <p className="font-label-sm text-label-sm text-text-muted">{upload.helper}</p>
          </div>
          <span className="mt-2 px-6 py-2 bg-primary text-white font-label-md text-label-md rounded-lg hover:bg-secondary transition-colors">
            {upload.buttonLabel}
          </span>
        </div>
      </label>

      <div className="p-4 bg-surface-container-high rounded-xl border border-outline-variant flex gap-4">
        <MaterialIcon name={tip.icon} className="text-secondary" />
        <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
          {tip.text}
        </p>
      </div>

      <section className="rounded-xl border border-border-subtle bg-surface-container-lowest p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <MaterialIcon name="style" className="text-secondary text-[20px]" />
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-primary">
            Phối kèm
          </h3>
        </div>
        <CompanionItems items={companionItems} />
      </section>

      <LoadingButton
        disabled={!eligibleItems.length}
        isLoading={isGenerating}
        onClick={onGenerate}
        className="w-full py-4 bg-secondary text-on-secondary font-headline-md text-headline-md rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:shadow-none disabled:hover:scale-100"
      >
        {!isGenerating && <MaterialIcon name="auto_awesome" filled />}
        {isGenerating ? 'Đang phân tích...' : action.label}
      </LoadingButton>
    </div>
  )
}
