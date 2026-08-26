import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  subValueType?: 'positive' | 'negative' | 'neutral' | 'accent';
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  progress?: number; // 0 - 100
  progressColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  subValueType = 'neutral',
  icon: Icon,
  iconColor = '#3b82f6',
  iconBg = 'rgba(59, 130, 246, 0.12)',
  progress,
  progressColor = '#3b82f6'
}) => {
  const getSubColor = () => {
    switch (subValueType) {
      case 'positive': return 'var(--profit-green)';
      case 'negative': return 'var(--loss-red)';
      case 'accent': return 'var(--accent-blue)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {title}
          </span>
          <div style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            marginTop: '4px',
            color: '#f8fafc',
            letterSpacing: '-0.02em'
          }}>
            {value}
          </div>
        </div>

        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          backgroundColor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={20} color={iconColor} />
        </div>
      </div>

      <div style={{ marginTop: '12px' }}>
        {subValue && (
          <div style={{ fontSize: '0.75rem', color: getSubColor(), fontWeight: 500 }}>
            {subValue}
          </div>
        )}

        {typeof progress === 'number' && (
          <div style={{ marginTop: '8px' }}>
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#1e293b',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                height: '100%',
                backgroundColor: progressColor,
                borderRadius: '2px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
