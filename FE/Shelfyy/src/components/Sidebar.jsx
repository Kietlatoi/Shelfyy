import { BrandLogo } from './BrandLogo'
import { MaterialIcon } from './MaterialIcon'

export function Sidebar({ activeKey = 'home', data }) {
  return (
    <nav className="bg-surface dark:bg-surface-dim h-screen w-64 fixed left-0 top-0 border-r border-border-subtle dark:border-outline-variant flex flex-col py-8 px-4 z-50">
      <a className="mb-10 px-2" href="#/home" aria-label="Shelfy home">
        <BrandLogo
          markClassName="h-10 w-10"
          name={data.brand.name}
          tagline={data.brand.tagline}
          textClassName="max-w-[160px]"
        />
      </a>

      <div className="flex-grow space-y-2">
        {data.navItems.map((item) => {
          const isActive = item.key === activeKey

          return (
            <a
              aria-current={isActive ? 'page' : undefined}
              className={
                isActive
                  ? 'flex items-center gap-3 py-3 px-4 rounded-lg text-secondary font-bold border-r-4 border-secondary bg-surface-container-low transition-colors duration-200'
                  : 'flex items-center gap-3 py-3 px-4 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors duration-200'
              }
              href={item.href}
              key={item.label}
            >
              <MaterialIcon name={item.icon} filled={isActive} />
              <span className="font-label-md text-label-md">{item.label}</span>
            </a>
          )
        })}
      </div>

      <div className="mt-auto space-y-4">
        <div className="mb-4 p-4 rounded-xl bg-primary-container text-white">
          <p className="text-xs font-semibold mb-1 opacity-80">{data.plan.eyebrow}</p>
          <p className="text-sm font-bold mb-3">{data.plan.title}</p>
          <a
            className="block text-center w-full py-2 bg-secondary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
            href="#/up-prenium"
          >
            {data.plan.action}
          </a>
        </div>

        <div className="pt-6 border-t border-border-subtle">
          {data.utilityLinks.map((item) => (
            <a
              className="flex items-center gap-3 py-2 px-4 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors duration-200"
              href={item.href}
              key={item.label}
            >
              <MaterialIcon name={item.icon} />
              <span className="font-label-md text-label-md">{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
