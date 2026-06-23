import { MaterialIcon } from './MaterialIcon'

export function CalendarCard({ calendar }) {
  return (
    <section className="bg-white rounded-3xl border border-border-subtle overflow-hidden shadow-sm flex flex-col h-[500px]">
      <div className="p-6 border-b border-border-subtle flex justify-between items-center">
        <h3 className="font-headline-md text-headline-md text-primary">{calendar.title}</h3>
        <button className="p-2 hover:bg-surface-container-low rounded-full transition-colors" type="button">
          <MaterialIcon name="calendar_today" />
        </button>
      </div>

      <div className="flex-grow overflow-hidden relative">
        <div className="absolute inset-0">
          <img
            alt="Calendar View"
            className="w-full h-full object-cover calendar-mask"
            src={calendar.image}
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/90 to-transparent">
          <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-2xl border border-border-subtle mb-4">
            <div className="bg-secondary text-white w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold">
              <span className="text-[10px] leading-none uppercase">{calendar.event.month}</span>
              <span className="text-lg leading-tight">{calendar.event.day}</span>
            </div>
            <div className="flex-grow">
              <h4 className="font-bold text-primary text-label-md">{calendar.event.title}</h4>
              <p className="text-label-sm text-text-muted">{calendar.event.meta}</p>
            </div>
            <MaterialIcon name="chevron_right" className="text-on-surface-variant" />
          </div>
          <button className="w-full py-3 border-2 border-dashed border-border-subtle rounded-2xl text-on-surface-variant font-label-md hover:border-secondary hover:text-secondary transition-all">
            {calendar.addLabel}
          </button>
        </div>
      </div>
    </section>
  )
}
