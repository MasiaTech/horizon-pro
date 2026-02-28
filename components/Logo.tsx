import Link from 'next/link'

/**
 * Logo Horizon — cercle ouvert + courbe de croissance.
 * Palette : #F3F4F6 (cercle), #16A34A (courbe).
 */

interface LogoProps {
  /** Taille du logo (width/height). Défaut: 80 */
  size?: number
  /** Classe CSS optionnelle (ex. pour responsive) */
  className?: string
  /** Lien vers l'accueil si défini (utilise Next.js Link) */
  href?: string
}

export default function Logo({ size = 80, className = '', href }: LogoProps) {
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Cercle ouvert */}
      <path
        d="M110 40 A70 70 0 1 1 60 160"
        stroke="#F3F4F6"
        strokeWidth="8"
        fill="none"
      />
      {/* Courbe de croissance */}
      <path
        d="M60 130 Q110 80 160 90"
        stroke="#16A34A"
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0 focus:outline-none focus:ring-2 focus:ring-horizon-primary focus:ring-offset-2 focus:ring-offset-horizon-background rounded"
      >
        {svg}
      </Link>
    )
  }

  return svg
}
