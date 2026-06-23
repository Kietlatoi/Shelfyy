import { MaterialIcon } from './MaterialIcon'

export function OutfitSuggestion({ outfit }) {
  return (
    <section className="bg-surface-container-lowest rounded-[40px] border border-border-subtle p-8 h-full flex flex-col overflow-hidden relative shadow-xl shadow-primary/5">
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 text-secondary mb-2">
              <MaterialIcon name="auto_awesome" filled />
              <span className="font-bold text-label-md tracking-widest uppercase">{outfit.eyebrow}</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-primary max-w-md">{outfit.title}</h2>
          </div>
          <div className="bg-surface-container-high px-4 py-2 rounded-full flex items-center gap-2">
            <MaterialIcon name="energy_savings_leaf" filled className="text-secondary text-sm" />
            <span className="text-label-sm font-bold text-on-surface-variant">{outfit.remaining}</span>
          </div>
        </div>

        <div className="flex-grow flex gap-8 items-stretch">
          <div className="w-2/3 rounded-3xl overflow-hidden shadow-2xl relative group">
            <img
              alt="AI Suggestion Outfit"
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              src={outfit.image}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-8">
              <p className="text-white text-body-md italic font-light">"{outfit.quote}"</p>
            </div>
          </div>

          <div className="w-1/3 flex flex-col gap-4">
            <div className="flex-grow space-y-4">
              {outfit.items.map((item) => (
                <button
                  className="w-full p-4 bg-surface rounded-2xl border border-border-subtle hover:border-secondary transition-colors cursor-pointer group text-left"
                  key={item.category}
                  type="button"
                >
                  <p className="text-[10px] text-text-muted uppercase font-bold mb-1">
                    {item.category}
                  </p>
                  <p className="text-label-md font-bold group-hover:text-secondary">{item.name}</p>
                </button>
              ))}
            </div>
            <div className="space-y-3 pt-6 border-t border-border-subtle">
              <button 
                onClick={() => window.location.hash = '/trial'}
                className="w-full bg-primary text-white py-5 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-secondary active:scale-[0.98] transition-all group"
              >
                <MaterialIcon name="checkroom" className="group-hover:rotate-12 transition-transform" />
                <span className="font-label-md text-label-md">{outfit.primaryAction}</span>
              </button>
              <button className="w-full bg-white border border-border-subtle text-on-surface py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-surface-container-low transition-all">
                <MaterialIcon name="refresh" />
                <span className="font-label-md text-label-md">{outfit.secondaryAction}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full -mr-48 -mt-48 blur-[100px]" />
    </section>
  )
}
