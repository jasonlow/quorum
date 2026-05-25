import React from 'react';
import type { LucideIcon } from 'lucide-react';

type BtnKind = 'default' | 'primary' | 'accent' | 'ghost' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: BtnKind;
  size?: BtnSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
};

export function Btn({
  kind = 'default',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  ...rest
}: BtnProps) {
  const classes = [
    'btn',
    kind === 'primary' && 'btn-primary',
    kind === 'accent'  && 'btn-accent',
    kind === 'ghost'   && 'btn-ghost',
    kind === 'danger'  && 'btn-danger',
    size === 'sm' && 'btn-sm',
    size === 'lg' && 'btn-lg',
    className,
  ].filter(Boolean).join(' ');
  const iconSize = size === 'lg' ? 15 : 13;
  return (
    <button className={classes} {...rest}>
      {Icon && <Icon size={iconSize} strokeWidth={1.7} />}
      {children}
      {IconRight && <IconRight size={iconSize} strokeWidth={1.7} />}
    </button>
  );
}
