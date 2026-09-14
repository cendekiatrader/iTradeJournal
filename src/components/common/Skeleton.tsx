import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

const radiusFor = (variant: string): string =>
  variant === 'circular' ? '50%' : variant === 'card' ? 'var(--radius-lg)' : variant === 'text' ? '6px' : 'var(--radius-md)';

const sizeFor = (value: string | number | undefined): string | undefined =>
  value === undefined ? undefined : typeof value === 'number' ? `${value}px` : value;

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  count = 1
}) => (
  <>
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className={className}
        aria-hidden="true"
        style={{
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: radiusFor(variant),
          animation: 'pulseGlow 1.6s ease-in-out infinite',
          width: sizeFor(width),
          height: sizeFor(height) ?? (variant === 'card' ? '144px' : variant === 'text' ? '14px' : undefined)
        }}
      />
    ))}
  </>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '118px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Skeleton variant="text" width="45%" />
      <Skeleton variant="circular" width={28} height={28} />
    </div>
    <Skeleton variant="text" width="65%" height={26} />
    <Skeleton variant="text" width="35%" />
  </div>
);

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }} aria-hidden="true">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} style={{ padding: '12px 14px' }}>
        <Skeleton variant="text" width={i === 0 ? '70%' : '50%'} />
      </td>
    ))}
  </tr>
);
