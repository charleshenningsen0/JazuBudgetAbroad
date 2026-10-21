interface IconProps {
  className?: string
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function IconPlane({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10.2 3.3 12 2l1.8 1.3v6.2l7.4 4.3v2.1l-7.4-2.2v4.9l2.6 1.9v1.6L12 21l-4.4 1.2v-1.6l2.6-1.9v-4.9L2.8 15.9v-2.1l7.4-4.3V3.3Z" />
    </svg>
  )
}

export function IconBed({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 19v-9m0 5h18m0 4v-6a2 2 0 0 0-2-2h-6v4M7 11V7.5A2.5 2.5 0 0 1 9.5 5H11" />
      <circle cx="6" cy="11" r="1.6" />
    </svg>
  )
}

export function IconFood({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 2v8a2 2 0 0 0 2 2h.5V22m0-10h.5a2 2 0 0 0 2-2V2M8.5 12V2m9 20V2c-1.7 1.3-2.5 3.4-2.5 5.5 0 2 1 3.2 2.5 3.5" />
    </svg>
  )
}

export function IconBus({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 4h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm0 6h16M8 20v-2m8 2v-2" />
      <circle cx="8" cy="13.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconTicket({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
      <path d="M14 6v12" strokeDasharray="2 2.5" />
    </svg>
  )
}

export function IconBag({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  )
}

export function IconShield({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 5 6v5.5c0 4.2 2.9 8 7 9.5 4.1-1.5 7-5.3 7-9.5V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  )
}

export function IconStamp({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 21V4h9a4 4 0 0 1 0 8H5" />
      <path d="M9 8h5M9 12h3" />
    </svg>
  )
}

export function IconSparkle({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3v4m0 10v4M3 12h4m10 0h4M6.5 6.5 9.2 9.2m5.6 5.6 2.7 2.7m0-11-2.7 2.7M9.2 14.8l-2.7 2.7" />
    </svg>
  )
}

export function IconChart({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 20V10m5.5 10V4m5.5 16v-7m5.5 7V8" />
    </svg>
  )
}

export function IconShare({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.3M8.2 13.2l7.6 4.3" />
    </svg>
  )
}

export function IconPrint({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 9V3h10v6M7 19H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 15h10v6H7z" />
    </svg>
  )
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  )
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}

export function IconWarning({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 4 2.8 20h18.4L12 4Z" />
      <path d="M12 10v4m0 3v.5" />
    </svg>
  )
}
