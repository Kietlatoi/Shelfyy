import { MaterialIcon } from './MaterialIcon'

export function SuggestInsights({ insight, trends }) {
  return (
    <section className="mt-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className="md:col-span-2 bg-primary-container text-on-primary-container p-8 rounded-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-headline-md text-headline-md mb-4 text-white">{insight.title}</h3>
            <p className="text-body-lg text-on-primary-container/80 max-w-lg mb-8">{insight.text}</p>
            <div className="flex gap-4">
              {insight.chips.map((chip) => (
                <div className="flex flex-col items-center" key={chip.label}>
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-2">
                    <MaterialIcon name={chip.icon} className="text-white" />
                  </div>
                  <span className="text-label-sm text-white/60">{chip.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute right-0 bottom-0 w-64 h-64 opacity-20">
            <MaterialIcon name="auto_awesome" className="text-[200px] text-white select-none" />
          </div>
        </div>

        <div className="bg-white border border-border-subtle p-8 rounded-2xl">
          <h3 className="font-headline-md text-label-md text-primary mb-6 uppercase tracking-widest">
            {trends.title}
          </h3>
          <div className="space-y-6">
            {trends.items.map((trend) => (
              <div className="flex items-center gap-4" key={trend.title}>
                <div className="w-14 h-14 bg-surface-container-low rounded-lg flex items-center justify-center">
                  <MaterialIcon name={trend.icon} className="text-primary" />
                </div>
                <div>
                  <p className="font-label-md text-primary">{trend.title}</p>
                  <p className="text-label-sm text-text-muted">{trend.description}</p>
                </div>
              </div>
            ))}
            <button className="w-full mt-4 py-2 text-secondary font-label-md border-b-2 border-secondary/20 hover:border-secondary transition-all" type="button">
              {trends.action}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
