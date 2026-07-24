export function LogoMark({ className = 'h-10 w-10', tone = 'default', title = 'Shelfy' }) {
  const inverse = tone === 'inverse'
  const surface = inverse ? '#ffffff' : '#050507'
  const primaryStroke = inverse ? '#050507' : '#ffffff'

  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title || undefined}
      className={className}
      fill="none"
      role={title ? 'img' : undefined}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title>{title}</title>}
      <rect height="64" rx="14" width="64" fill={surface} />
      <path
        d="M32 18.5c0-4.1 3.1-7.2 7-7.2 3.5 0 6.2 2.4 6.2 5.8 0 5.4-7.4 6.3-12.4 11.5"
        stroke={primaryStroke}
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M31.8 25.6 14.4 45.8h35.2L31.8 25.6Z"
        stroke={primaryStroke}
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M22.6 39.8c5.7-5.2 13.5-5.2 19.2 0"
        stroke="#0f9f8f"
        strokeLinecap="round"
        strokeWidth="3.5"
      />
      <path
        d="M24.4 32.9c4.5-3.2 10.5-3.2 15 0"
        stroke="#ba0035"
        strokeLinecap="round"
        strokeWidth="3.5"
      />
      <path d="M51 13.5h3.2M52.6 11.9v3.2M47.7 20.4h2.4M48.9 19.2v2.4" stroke="#f7c948" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  )
}

export function BrandLogo({
  className = '',
  markClassName = 'h-10 w-10',
  name = 'Shelfy',
  tagline = '',
  textClassName = '',
  tone = 'default',
}) {
  const inverse = tone === 'inverse'
  const nameTone = inverse ? 'text-white' : 'text-primary'
  const taglineTone = inverse ? 'text-white/60' : 'text-on-surface-variant'

  return (
    <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      <LogoMark className={`${markClassName} flex-none`} tone={tone} title="" />
      <span className={`min-w-0 ${textClassName}`}>
        <span className={`block truncate text-2xl font-extrabold leading-tight ${nameTone}`}>
          {name}
        </span>
        {tagline && (
          <span className={`block truncate text-[11px] font-bold uppercase tracking-widest ${taglineTone}`}>
            {tagline}
          </span>
        )}
      </span>
    </span>
  )
}
