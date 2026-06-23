import { MaterialIcon } from './MaterialIcon'

export function TopNav({ data, onNotify }) {
  return (
    <header className="fixed top-0 right-0 left-64 h-16 z-40 bg-surface/80 backdrop-blur-md dark:bg-surface-dim/80 border-b border-border-subtle dark:border-outline-variant flex items-center justify-between px-gutter">
      <div className="flex items-center gap-4 w-1/2">
        <label className="relative w-full max-w-md">
          <span className="sr-only">Tìm kiếm trang phục</span>
          <MaterialIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl"
          />
          <input
            className="w-full pl-10 pr-4 py-2 bg-surface-container border-none rounded-full focus:ring-2 focus:ring-primary/10 text-label-md font-label-md"
            placeholder={data.searchPlaceholder}
            type="text"
          />
        </label>
      </div>

      <div className="flex items-center gap-6">
        <button
          aria-label="Xem thông báo"
          className="text-on-surface-variant hover:text-secondary transition-all cursor-pointer"
          onClick={onNotify}
          type="button"
        >
          <MaterialIcon name="notifications" />
        </button>
        <button className="flex items-center gap-3 cursor-pointer group bg-transparent border-0" type="button">
          <div className="text-right">
            <p className="font-label-md text-label-md text-on-surface group-hover:text-secondary transition-colors">
              {data.user.name}
            </p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">
              {data.user.membership}
            </p>
          </div>
          <MaterialIcon
            name="account_circle"
            className="text-4xl text-on-surface-variant group-hover:text-secondary transition-all"
          />
        </button>
      </div>
    </header>
  )
}
