import { MaterialIcon } from './MaterialIcon'

export function PremiumTopNav({ data }) {
  return (
    <header className="fixed top-0 right-0 left-64 h-16 z-40 bg-surface/80 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-margin-desktop">
      <div className="relative w-96">
        <MaterialIcon
          name="search"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm"
        />
        <input
          className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-label-md focus:ring-1 focus:ring-primary"
          placeholder={data.searchPlaceholder}
          type="text"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="text-on-surface-variant hover:text-secondary transition-all" type="button">
          <MaterialIcon name="notifications" />
        </button>
        <button className="h-8 w-8 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border border-border-subtle cursor-pointer" type="button">
          <img className="w-full h-full object-cover" src={data.avatar} alt="User avatar" />
        </button>
      </div>
    </header>
  )
}
