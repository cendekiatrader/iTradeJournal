import React from 'react';
import { useJournal } from '../../context/JournalContext';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, hideToast } = useJournal();

  if (!toast.visible) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={18} color="#10b981" />;
      case 'error':
        return <AlertTriangle size={18} color="#ef4444" />;
      default:
        return <Info size={18} color="#3b82f6" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success': return 'rgba(16, 185, 129, 0.4)';
      case 'error': return 'rgba(239, 68, 68, 0.4)';
      default: return 'rgba(59, 130, 246, 0.4)';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        backgroundColor: '#0c1222',
        border: `1px solid ${getBorderColor()}`,
        borderRadius: '12px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
        zIndex: 2000,
        animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        maxWidth: '420px'
      }}
    >
      {getIcon()}
      <span style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 500 }}>
        {toast.message}
      </span>
      <button
        onClick={hideToast}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '2px',
          marginLeft: '6px'
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
