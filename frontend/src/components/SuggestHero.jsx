import { MaterialIcon } from './MaterialIcon'

export function SuggestHero({ data }) {
  return (
    <section className="mb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-secondary font-label-md tracking-widest uppercase mb-2 block">
            {data.eyebrow}
          </span>
          <h2 className="font-headline-lg text-headline-lg text-primary max-w-2xl">
            {data.title}
          </h2>
        </div>
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
          <div className="flex items-center gap-3">
            <MaterialIcon name={data.weather.icon} className="text-secondary text-headline-md" />
            <div>
              <p className="font-label-md text-primary">{data.weather.location}</p>
              <p className="text-label-sm text-text-muted">{data.weather.condition}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
