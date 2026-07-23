import { MaterialIcon } from './MaterialIcon'

function todayLabel() {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
}

function eventTime(event) {
  if (event.time) return event.time
  if (event.startTime && event.endTime) return `${event.startTime} - ${event.endTime}`
  return event.startTime || event.endTime || 'Cả ngày'
}

export function CalendarCard({ calendar, onPrimaryAction, loading = false, error = '' }) {
  const events = Array.isArray(calendar.events) ? calendar.events : []
  const hasEvents = events.length > 0
  const isConnected = Boolean(calendar.connected)
  const actionLabel = calendar.actionLabel || (isConnected ? 'Mở Google Calendar' : 'Kết nối Google Calendar')
  const handlePrimaryAction = () => {
    if (onPrimaryAction) {
      onPrimaryAction()
      return
    }

    if (calendar.calendarUrl) {
      window.location.href = calendar.calendarUrl
    }
  }

  return (
    <section className="bg-white rounded-3xl border border-border-subtle overflow-hidden shadow-sm">
      <div className="p-6 border-b border-border-subtle flex justify-between items-start gap-4">
        <div className="min-w-0">
          <p className="text-label-sm font-bold uppercase tracking-[0.16em] text-secondary">
            {calendar.sourceLabel}
          </p>
          <h3 className="mt-2 font-headline-md text-headline-md text-primary">
            {calendar.title}
          </h3>
          <p className="mt-2 text-label-md text-text-muted capitalize">{todayLabel()}</p>
          {calendar.providerEmail && (
            <p className="mt-1 truncate text-label-sm text-text-muted">{calendar.providerEmail}</p>
          )}
        </div>
        <button
          aria-label={actionLabel}
          className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border-subtle text-primary transition-colors hover:border-secondary hover:bg-surface-container-low hover:text-secondary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={handlePrimaryAction}
          title={actionLabel}
          type="button"
        >
          <MaterialIcon name={isConnected ? 'calendar_month' : 'add_link'} />
        </button>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-label-md font-semibold text-amber-700" role="alert">
            {error}
          </div>
        )}

        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] gap-4 text-label-sm font-bold uppercase tracking-[0.08em] text-text-muted">
          <span>Sự kiện</span>
          <span>Thời gian</span>
        </div>

        {hasEvents ? (
          <div className="divide-y divide-border-subtle border-y border-border-subtle">
            {events.map((event) => (
              <article
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4"
                key={event.id || `${event.title}-${event.startTime || event.time}`}
              >
                <div className="min-w-0">
                  <h4 className="truncate text-label-lg font-bold text-primary">
                    {event.title}
                  </h4>
                  {event.location && (
                    <p className="mt-1 truncate text-label-sm text-text-muted">
                      {event.location}
                    </p>
                  )}
                  {event.description && (
                    <p className="mt-1 line-clamp-2 text-label-sm text-text-muted">
                      {event.description}
                    </p>
                  )}
                </div>
                <time className="whitespace-nowrap text-label-md font-bold text-secondary">
                  {eventTime(event)}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <div className="border-y border-border-subtle bg-surface-container-low py-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-secondary text-white">
                <MaterialIcon name={isConnected ? 'event_available' : 'event_busy'} />
              </div>
              <div className="min-w-0">
                <h4 className="text-label-lg font-bold text-primary">
                  {isConnected ? calendar.emptyTitle : calendar.statusTitle}
                </h4>
                <p className="mt-1 text-label-md text-text-muted">
                  {isConnected ? calendar.emptyDescription : calendar.statusDescription}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border-subtle px-4 py-3 font-label-md text-primary transition-colors hover:border-secondary hover:text-secondary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={handlePrimaryAction}
          type="button"
        >
          <MaterialIcon name={isConnected ? 'open_in_new' : 'add_link'} size={20} />
          {loading ? 'Đang xử lý...' : actionLabel}
        </button>
      </div>
    </section>
  )
}
