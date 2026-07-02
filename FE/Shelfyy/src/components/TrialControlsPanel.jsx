import { MaterialIcon } from './MaterialIcon'
import { LoadingButton } from './LoadingButton'

export function TrialControlsPanel({
  action,
  isUploaded,
  onGenerate,
  onUpload,
  outfit,
  tip,
  upload,
  isGenerating = false,
}) {
  return (
    <div className="md:col-span-4 space-y-6 w-full">
      <section className="bg-surface-container-lowest border border-border-subtle rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-subtle flex justify-between items-center">
          <h2 className="font-label-md text-label-md text-primary uppercase tracking-tight">
            {outfit.header}
          </h2>
          <MaterialIcon name="checkroom" className="text-secondary text-[20px]" />
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

      <label
        className={`bg-surface-container-lowest border-2 ${
          isUploaded ? 'border-solid bg-secondary/5 border-secondary' : 'border-dashed border-outline-variant'
        } rounded-xl p-8 text-center transition-all hover:border-secondary group cursor-pointer relative overflow-hidden block`}
      >
        <input
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          onChange={onUpload}
          type="file"
        />
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-secondary-fixed transition-colors">
            <MaterialIcon
              name="upload_file"
              className="text-on-surface-variant group-hover:text-secondary text-[32px]"
            />
          </div>
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

      <LoadingButton
        isLoading={isGenerating}
        onClick={onGenerate}
        className="w-full py-4 bg-secondary text-on-secondary font-headline-md text-headline-md rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
      >
        {!isGenerating && <MaterialIcon name="auto_awesome" filled />}
        {isGenerating ? 'Đang phân tích...' : action.label}
      </LoadingButton>
    </div>
  )
}
