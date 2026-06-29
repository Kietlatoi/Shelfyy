import { MaterialIcon } from './MaterialIcon'

export function TrialTopNav({ data }) {
  return (
    <nav className="fixed top-0 right-0 left-0 h-16 z-40 flex items-center justify-between px-margin-desktop w-full bg-surface/80 backdrop-blur-md border-b border-border-subtle">
      <div className="flex items-center gap-4">
        <button
          aria-label="Quay lại"
          className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
          onClick={() => window.history.back()}
          type="button"
        >
          <MaterialIcon name="arrow_back" className="text-on-surface" />
        </button>
        <span className="font-headline-md text-headline-md font-bold text-primary">{data.brand}</span>
        <span className="ml-2 px-3 py-1 bg-secondary text-white text-[10px] font-bold rounded-full tracking-wider uppercase">
          {data.badge}
        </span>
      </div>
      <div className="flex items-center gap-6">
        <button
          aria-label="Xem thông báo"
          className="text-on-surface-variant cursor-pointer hover:text-secondary transition-all"
          type="button"
        >
          <MaterialIcon name="notifications" />
        </button>
        <button
          aria-label="Tài khoản"
          className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center cursor-pointer"
          type="button"
        >
          <MaterialIcon name="account_circle" className="text-on-surface-variant" />
        </button>
      </div>
    </nav>
  )
}
