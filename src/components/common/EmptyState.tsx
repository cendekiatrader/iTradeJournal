import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      padding: compact ? '28px 20px' : '56px 24px',
      textAlign: 'center'
    }}
  >
    {icon && (
      <div
        style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          backgroundColor: 'color-mix(in srgb, var(--theme-secondary-strong) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--theme-secondary-strong) 25%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--theme-secondary)'
        }}
      >
        {icon}
      </div>
    )}
    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
    {description && (
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.55, margin: 0 }}>
        {description}
      </p>
    )}
    {actionLabel && onAction && (
      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: '6px' }} onClick={onAction}>
        {actionLabel}
      </button>
    )}
  </div>
);
