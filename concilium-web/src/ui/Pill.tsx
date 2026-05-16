import React from 'react';

export type PillTone = 'green' | 'amber' | 'red' | 'blue' | 'accent' | 'ink';

type PillProps = {
  tone?: PillTone;
  square?: boolean;
  withDot?: boolean;
  children: React.ReactNode;
};

export function Pill({ tone, square, withDot, children }: PillProps) {
  const classes = [
    'pill',
    square && 'pill-sq',
    tone && `pill-${tone}`,
  ].filter(Boolean).join(' ');
  return (
    <span className={classes}>
      {withDot && <span className="dot" />}
      {children}
    </span>
  );
}
