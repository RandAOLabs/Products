import './LogoLink.css'

interface LogoLinkProps {
  href: string
  src: string
  alt: string
  className?: string
}

export function LogoLink({ href, src, alt, className = 'logo' }: LogoLinkProps) {
  return (
    <a href={href} target="_blank">
      <img src={src} className={className} alt={alt} />
    </a>
  )
}
