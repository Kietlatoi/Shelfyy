import { MaterialIcon } from './MaterialIcon'

export function WardrobeTopNav({ data }) {
  return (
    <header className="fixed top-0 right-0 left-64 h-16 z-40 bg-surface/80 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-10">
      <div className="flex items-center bg-surface-container-low border border-border-subtle rounded-full px-4 py-1.5 w-96">
        <MaterialIcon name="search" className="text-on-surface-variant text-lg" />
        <input
          className="bg-transparent border-none focus:ring-0 text-sm w-full ml-2"
          placeholder={data.searchPlaceholder}
          type="text"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-all">
          <MaterialIcon name="notifications" />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-border-subtle">
          <span className="text-sm font-semibold">{data.userName}</span>
          <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border border-border-subtle">
            <MaterialIcon name="account_circle" />
          </div>
        </div>
      </div>
    </header>
  )
}
