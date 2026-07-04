import { ReactNode } from 'react'
import clsx from 'clsx'

export default function GlassCard({
  children,
  className,
  style,
  onClick,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}) {
  return (
    <div className={clsx('glass-card', className)} style={style} onClick={onClick}>
      {children}
    </div>
  )
}
