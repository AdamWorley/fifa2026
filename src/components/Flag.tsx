import { FLAG_URLS } from '../lib/flagUrls'

interface Props {
  iso: string | null
  /** Tailwind text-size class controls the flag height (height is set to 1em). */
  className?: string
  title?: string
}

/**
 * Renders a real SVG country flag as an <img>. Emoji flags don't render on
 * Windows, so we never rely on them. Only the flags this tournament needs are
 * bundled (see flagUrls.ts), and they're eagerly preloaded on app start.
 */
export default function Flag({ iso, className = '', title }: Readonly<Props>) {
  const url = iso ? FLAG_URLS[iso.toLowerCase()] : undefined
  if (!url) {
    return (
      <span className={`inline-block ${className}`} role="img" aria-label={title ?? 'flag'}>
        🏳️
      </span>
    )
  }
  return (
    <img
      src={url}
      alt={title ?? ''}
      title={title}
      loading="eager"
      decoding="async"
      style={{ height: '1em', width: 'auto' }}
      className={`inline-block rounded-[2px] align-middle shadow-sm ring-1 ring-black/5 ${className}`}
    />
  )
}
