import { MaterialIcon } from './MaterialIcon'

export function SuggestTopNav({ data }) {
  return (
    <header className="fixed top-0 right-0 left-64 h-16 z-40 bg-surface/80 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-margin-desktop">
      <div className="flex items-center bg-surface-container-low px-4 py-2 rounded-full w-96 border border-border-subtle">
        <MaterialIcon name="search" className="text-outline text-body-md mr-2" />
        <input
          className="bg-transparent border-none focus:ring-0 text-body-md w-full p-0"
          placeholder={data.searchPlaceholder}
          type="text"
        />
      </div>
      <div className="flex items-center gap-6">
        <button className="relative text-on-surface-variant hover:text-secondary transition-all" type="button">
          <MaterialIcon name="notifications" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full border-2 border-surface" />
        </button>
        <button className="flex items-center gap-2 group" type="button">
          <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden border border-border-subtle">
            <img className="w-full h-full object-cover" src={data.avatar} alt="User avatar" />
          </div>
          <MaterialIcon
            name="account_circle"
            className="text-on-surface-variant group-hover:text-secondary transition-all"
          />
        </button>
      </div>
    </header>
  )
}
