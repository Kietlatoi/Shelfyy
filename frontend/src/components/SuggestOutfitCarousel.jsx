import { useRef } from 'react'
import { MaterialIcon } from './MaterialIcon'

function OutfitSuggestionCard({ action, item }) {
  return (
    <article className="flex-none w-[380px] snap-start">
      <div className="group relative overflow-hidden rounded-xl border border-border-subtle bg-white transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
        <div className="aspect-[0.48] overflow-hidden bg-white flex items-center justify-center">
          <img
            alt={item.title}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-700"
            src={item.image}
          />
        </div>
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {item.tags.map((tag, index) => (
            <span
              className={
                index === 0
                  ? 'bg-black/80 text-white text-[10px] px-3 py-1 rounded-full backdrop-blur-md uppercase tracking-wider font-bold'
                  : item.title === 'Urban Explorer Set'
                    ? 'bg-secondary text-white text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-bold'
                    : 'bg-white/80 text-primary text-[10px] px-3 py-1 rounded-full backdrop-blur-md border border-border-subtle uppercase tracking-wider font-bold'
              }
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="p-6 bg-white border-t border-border-subtle">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-headline-md text-label-md text-primary mb-1">{item.title}</h4>
              <p className="text-label-sm text-text-muted flex items-center gap-1">
                <MaterialIcon name={item.metaIcon} className="text-[14px]" />
                {item.meta}
              </p>
            </div>
            <MaterialIcon name="favorite" className={item.favorite ? 'text-secondary' : 'text-outline'} />
          </div>
          <button 
            onClick={() => window.location.hash = '/trial'}
            className="w-full py-3 bg-secondary text-on-secondary rounded-lg font-label-md flex items-center justify-center gap-2 group-hover:bg-primary transition-all" 
            type="button"
          >
            <MaterialIcon name="checkroom" className="text-[18px]" />
            {action}
          </button>
        </div>
      </div>
    </article>
  )
}

export function SuggestOutfitCarousel({ data }) {
  const scrollRef = useRef(null)

  const scrollGrid = (direction) => {
    scrollRef.current?.scrollBy({ left: direction * 400, behavior: 'smooth' })
  }

  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-headline-md text-headline-md text-primary">{data.title}</h3>
        <div className="flex gap-2">
          <button
            className="w-10 h-10 rounded-full border border-border-subtle flex items-center justify-center hover:bg-surface-container-low transition-colors"
            onClick={() => scrollGrid(-1)}
            type="button"
          >
            <MaterialIcon name="chevron_left" />
          </button>
          <button
            className="w-10 h-10 rounded-full border border-border-subtle flex items-center justify-center hover:bg-surface-container-low transition-colors"
            onClick={() => scrollGrid(1)}
            type="button"
          >
            <MaterialIcon name="chevron_right" />
          </button>
        </div>
      </div>
      <div
        className="flex gap-gutter overflow-x-auto no-scrollbar scroll-smooth pb-8 snap-x snap-mandatory"
        ref={scrollRef}
      >
        {data.items.map((item) => (
          <OutfitSuggestionCard action={data.action} item={item} key={item.title} />
        ))}
      </div>
    </section>
  )
}
