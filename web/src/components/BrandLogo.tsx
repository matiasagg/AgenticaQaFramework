type BrandLogoProps = {
  compact?: boolean
  className?: string
}

export default function BrandLogo({
  compact = false,
  className = '',
}: BrandLogoProps) {
  return (
    <img
      src="/qacelerate-logo.png"
      alt="Qacelerate logo"
      className={`${compact ? 'h-20 w-auto sm:h-[5.5rem] md:h-24' : 'h-32 w-auto md:h-40'} object-contain ${className}`}
    />
  )
}
