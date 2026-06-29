import { MaterialIcon } from './MaterialIcon'

export function StatsGrid({ stats }) {
  return (
    <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-gutter">
      {stats.map((stat) => (
        <article
          className="bg-surface-container-low p-6 rounded-3xl border border-border-subtle flex items-center gap-5"
          key={stat.label}
        >
          <div
            className={`w-14 h-14 rounded-2xl bg-white flex items-center justify-center ${
              stat.tone === 'gold' ? 'text-accent-gold' : 'text-secondary'
            } shadow-sm`}
          >
            <MaterialIcon name={stat.icon} className="text-3xl" />
          </div>
          <div>
            <p className="text-label-sm text-text-muted">{stat.label}</p>
            <p className="text-2xl font-bold text-primary">{stat.value}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
