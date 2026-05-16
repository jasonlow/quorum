import React from 'react';

type PageHeaderProps = {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, sub, right }: PageHeaderProps) {
  return (
    <div
      className="row gap-4"
      style={{
        alignItems: 'flex-end',
        padding: '24px 0 18px',
        borderBottom: '1px solid var(--hairline)',
        marginBottom: 24,
      }}
    >
      <div className="grow">
        {eyebrow && <div className="t-tiny" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <div className="t-h1">{title}</div>
        {sub && <div className="t-body muted" style={{ marginTop: 6, maxWidth: 720 }}>{sub}</div>}
      </div>
      {right && <div className="row gap-2">{right}</div>}
    </div>
  );
}
