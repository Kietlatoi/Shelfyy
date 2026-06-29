import { MaterialIcon } from './MaterialIcon'

export function PremiumTrust({ data }) {
  return (
    <section className="mt-24 bg-primary-container text-on-primary-container rounded-3xl p-12 overflow-hidden relative">
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
        <div className="md:w-1/2">
          <span className="font-label-md text-accent-gold uppercase tracking-widest">{data.eyebrow}</span>
          <h4 className="font-headline-lg text-headline-lg mt-4 mb-6">{data.title}</h4>
          <p className="font-body-lg text-on-primary-container/80 mb-8 italic">{data.quote}</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent-gold">
              <img className="w-full h-full object-cover" src={data.user.avatar} alt={data.user.name} />
            </div>
            <div>
              <p className="font-label-md font-bold">{data.user.name}</p>
              <p className="text-xs opacity-60">{data.user.role}</p>
            </div>
          </div>
        </div>

        <div className="md:w-1/2 grid grid-cols-2 gap-4">
          {data.stats.map((stat) => (
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10" key={stat.label}>
              <p className="text-3xl font-bold text-accent-gold mb-2">{stat.value}</p>
              <p className="text-sm opacity-80">{stat.label}</p>
            </div>
          ))}
          <div className="col-span-2 bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xl font-bold mb-1">{data.trial.title}</p>
              <p className="text-xs opacity-60">{data.trial.description}</p>
            </div>
            <MaterialIcon name={data.trial.icon} className="text-4xl text-accent-gold" />
          </div>
        </div>
      </div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
    </section>
  )
}
