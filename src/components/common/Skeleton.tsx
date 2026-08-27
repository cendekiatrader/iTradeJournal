import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  count = 1
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'text':
        return 'rounded h-4 my-1';
      case 'card':
        return 'rounded-xl h-36';
      case 'rectangular':
      default:
        return 'rounded-lg';
    }
  };

  const items = Array.from({ length: count });

  return (
    <>
      {items.map((_, idx) => (
        <div
          key={idx}
          className={`animate-pulse bg-surface-base/80 dark:bg-slate-800/60 border border-border-subtle ${getVariantClass()} ${className}`}
          style={{
            width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
            height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
          }}
        />
      ))}
    </>
  );
};

export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-4 flex flex-col gap-3 animate-pulse shadow-card">
      <div className="flex justify-between items-center">
        <Skeleton variant="text" width="40%" height={14} />
        <Skeleton variant="circular" width={28} height={28} />
      </div>
      <Skeleton variant="text" width="65%" height={24} />
      <div className="flex items-center gap-2 mt-1">
        <Skeleton variant="text" width="30%" height={12} />
      </div>
    </div>
  );
};

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => {
  return (
    <tr className="border-b border-border-subtle animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton variant="text" width={i === 0 ? '70%' : '50%'} height={16} />
        </td>
      ))}
    </tr>
  );
};
