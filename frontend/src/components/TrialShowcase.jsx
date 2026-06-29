import { MaterialIcon } from './MaterialIcon'

function PlaceholderView({ data }) {
  return (
    <div className="absolute inset-0 z-0">
      <img className="w-full h-full object-cover" src={data.image} alt={data.title} />
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex flex-col items-center justify-center p-12 text-center">
        <div className="w-24 h-24 mb-6 rounded-full border-4 border-secondary/30 flex items-center justify-center">
          <MaterialIcon name="model_training" className="text-secondary text-[48px] animate-pulse" />
        </div>
        <h3 className="font-headline-md text-headline-md text-primary mb-2">{data.title}</h3>
        <p className="font-body-md text-body-md text-text-muted max-w-md">{data.description}</p>
      </div>
    </div>
  )
}

function ProcessingView({ data }) {
  return (
    <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center">
      <div className="relative w-64 h-96 border border-white/20 rounded-lg overflow-hidden">
        <img className="w-full h-full object-cover opacity-50" src={data.image} alt={data.title} />
        <div className="scanner-line" />
      </div>
      <div className="mt-8 text-center">
        <p className="font-headline-md text-headline-md text-white mb-2">{data.title}</p>
        <div className="flex gap-1 justify-center">
          <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:0.1s]" />
          <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:0.2s]" />
          <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:0.3s]" />
        </div>
      </div>
    </div>
  )
}

function ResultView({ data }) {
  return (
    <div className="absolute inset-0 z-20">
      <img className="w-full h-full object-cover" src={data.image} alt="Kết quả thử đồ AI" />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-border-subtle">
        <button className="p-3 rounded-full bg-primary text-white flex items-center justify-center hover:bg-secondary transition-colors">
          <MaterialIcon name="download" />
        </button>
        <button className="p-3 rounded-full bg-surface-container-high text-primary flex items-center justify-center hover:bg-surface-variant transition-colors">
          <MaterialIcon name="share" />
        </button>
        <button className="px-6 py-2 rounded-full border border-primary font-label-md text-label-md hover:bg-primary hover:text-white transition-all">
          {data.saveLabel}
        </button>
      </div>
      <div className="absolute top-6 right-6 px-4 py-2 bg-secondary text-white font-label-sm text-label-sm rounded-lg shadow-md flex items-center gap-2">
        <MaterialIcon name="verified" className="text-[16px]" />
        {data.badge}
      </div>
    </div>
  )
}

export function TrialShowcase({ metrics, showcase, view }) {
  return (
    <div className="md:col-span-8 sticky top-24">
      <div className="relative bg-surface-container-lowest border border-border-subtle rounded-2xl overflow-hidden aspect-[3/4] md:aspect-[3/4] flex items-center justify-center shadow-xl">
        {view === 'placeholder' && <PlaceholderView data={showcase.placeholder} />}
        {view === 'processing' && <ProcessingView data={showcase.processing} />}
        {view === 'result' && <ResultView data={showcase.result} />}
      </div>

      <div className="mt-6 flex justify-between items-center px-4">
        <div className="flex items-center gap-8">
          {metrics.metrics.map((metric, index) => (
            <div className="contents" key={metric.label}>
              {index > 0 && <div className="h-8 w-[1px] bg-outline-variant" />}
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-text-muted">{metric.label}</span>
                <span className="font-label-md text-label-md text-primary">{metric.value}</span>
              </div>
            </div>
          ))}
        </div>
        <button className="flex items-center gap-2 text-secondary bg-transparent border-0" type="button">
          <MaterialIcon name="history" />
          <span className="font-label-md text-label-md font-bold underline cursor-pointer">
            {metrics.historyLabel}
          </span>
        </button>
      </div>
    </div>
  )
}
