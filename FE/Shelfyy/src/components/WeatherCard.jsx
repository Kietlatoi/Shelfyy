import { MaterialIcon } from "./MaterialIcon";

export function WeatherCard({ weather }) {
  return (
    <section className="bg-surface-container-low rounded-3xl p-8 border border-border-subtle overflow-hidden relative group">
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-secondary font-bold text-label-md uppercase tracking-widest mb-1">
              {weather.eyebrow}
            </p>
            <h2 className="font-headline-lg text-headline-lg text-primary">
              {weather.location}
            </h2>
          </div>
          <MaterialIcon
            name={weather.icon}
            filled
            size={100}
            className="text-accent-gold"
          />
        </div>

        <div className="mt-8 flex items-end gap-2">
          <span className="text-7xl font-bold tracking-tighter text-primary">
            {weather.temperature}
          </span>
          <div className="mb-3">
            <p className="text-label-md font-bold text-on-surface-variant">
              {weather.condition}
            </p>
            <p className="text-label-sm text-text-muted">{weather.feelsLike}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-border-subtle pt-6">
          {weather.metrics.map((metric, index) => (
            <div
              className={
                index === 1
                  ? "text-center border-x border-border-subtle"
                  : "text-center"
              }
              key={metric.label}
            >
              <p className="text-label-sm text-text-muted mb-1">
                {metric.label}
              </p>
              <p
                className={`font-bold ${metric.emphasis ? "text-secondary" : "text-primary"}`}
              >
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-accent-gold/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
    </section>
  );
}
