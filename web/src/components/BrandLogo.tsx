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
      src="/file_0000000071cc820eaa038c8bb3259a96 (1).png"
      alt="Accelerate logo"
      className={`${compact ? 'h-28 w-auto sm:h-32 md:h-36' : 'h-24 w-auto md:h-32'} ${className}`}
    />
  )
}
