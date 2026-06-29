export function PremiumFooter({ data }) {
  return (
    <footer className="ml-64 border-t border-border-subtle bg-white py-12 px-margin-desktop">
      <div className="max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <h5 className="font-headline-md text-primary mb-2">{data.brand}</h5>
          <p className="text-sm text-text-muted">{data.tagline}</p>
        </div>
        <div className="flex gap-4">
          {data.badges.map((badge) => (
            <img className="h-10" src={badge.src} alt={badge.alt} key={badge.alt} />
          ))}
        </div>
        <div className="flex gap-6 text-sm text-on-surface-variant">
          {data.links.map((link) => (
            <a className="hover:text-secondary transition-colors" href="#" key={link}>
              {link}
            </a>
          ))}
        </div>
      </div>
      <div className="max-w-container-max mx-auto mt-8 pt-8 border-t border-border-subtle/50 text-center text-xs text-text-muted">
        {data.copyright}
      </div>
    </footer>
  )
}
