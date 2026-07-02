import { MaterialIcon } from './MaterialIcon'

export function WardrobeAddSection({ aiUpload, intro, pairings, storage, onUploadClick }) {
  return (
    <section className="mb-12">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-1">{intro.title}</h2>
          <p className="text-on-surface-variant">{intro.description}</p>
        </div>
        <div className="flex gap-3">
          {intro.actions.map((action) => (
            <button
              className={`px-6 py-2.5 ${
                action.tone === 'secondary' ? 'bg-secondary' : 'bg-primary'
              } text-white font-label-md rounded-full flex items-center gap-2 hover:opacity-90 transition-opacity`}
              key={action.label}
              onClick={() => {
                if (action.label === "Tải ảnh lên" && onUploadClick) {
                  onUploadClick();
                }
              }}
            >
              <MaterialIcon name={action.icon} className="text-[20px]" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-border-subtle overflow-hidden relative group">
          <div className="aspect-[2.45/1] relative overflow-hidden bg-surface-container">
            <img className="w-full h-full object-cover" src={aiUpload.image} alt="AI đang tiến hành phân tích" />
            <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
              <div className="ai-scanner absolute inset-0" />
            </div>
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-2 border border-border-subtle">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-primary">{aiUpload.status}</span>
            </div>
          </div>

          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white">
            {aiUpload.results.map((result) => (
              <div className="space-y-1" key={result.label}>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  {result.label}
                </label>
                <div className="flex items-center gap-2">
                  {result.swatch ? (
                    <span
                      className="w-4 h-4 rounded-full border border-border-subtle"
                      style={{ backgroundColor: result.swatch }}
                    />
                  ) : (
                    <MaterialIcon name={result.icon} className="text-secondary text-lg" />
                  )}
                  <span className="font-semibold text-sm">{result.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-low border border-border-subtle rounded-2xl p-6 flex-1 flex flex-col justify-center">
            <h3 className="font-label-md text-primary mb-4">Gợi ý cách phối hôm nay</h3>
            <div className="space-y-4">
              {pairings.map((item) => (
                <div
                  className="flex items-center gap-4 p-3 bg-white rounded-xl border border-border-subtle"
                  key={item.title}
                >
                  {item.image ? (
                    <img
                      className="w-12 h-12 rounded-lg object-cover bg-surface-container"
                      src={item.image}
                      alt={item.title}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-surface-container rounded-lg" />
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-bold">{item.title}</p>
                    <p className="text-[10px] text-on-surface-variant">{item.description}</p>
                  </div>
                  <MaterialIcon name="chevron_right" className="text-on-surface-variant" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-secondary p-6 rounded-2xl text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">
              {storage.eyebrow}
            </p>
            <div className="flex items-end justify-between mb-3">
              <span className="text-3xl font-bold">{storage.used}</span>
              <span className="text-xs">{storage.limit}</span>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div className="bg-white h-full" style={{ width: `${storage.percent}%` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
