type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
type AvatarRim = 'amber' | 'green' | 'red' | 'accent';

type AvatarProps = {
  initials: string;
  size?: AvatarSize;
  rim?: AvatarRim;
};

export function Avatar({ initials, size = 'md', rim }: AvatarProps) {
  const classes = [
    'av',
    size === 'sm' && 'av-sm',
    size === 'lg' && 'av-lg',
    size === 'xl' && 'av-xl',
    rim && `av-rim-${rim}`,
  ].filter(Boolean).join(' ');
  return <span className={classes}>{initials.slice(0, 2).toUpperCase()}</span>;
}
