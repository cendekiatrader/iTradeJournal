import React, { useState, useRef, useCallback } from 'react';
import { Columns, SplitSquareVertical, Maximize2, X, Eye } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Before (Setup / Plan)',
  afterLabel = 'After (Execution / Outcome)'
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // 0% - 100%
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SplitSquareVertical size={16} color="#3b82f6" />
          <span>Dual Chart Before vs After Execution</span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className="btn btn-sm"
            style={{
              padding: '4px 10px',
              fontSize: '0.72rem',
              borderRadius: '6px',
              backgroundColor: viewMode === 'slider' ? '#1e3a8a' : '#0c1222',
              borderColor: viewMode === 'slider' ? '#3b82f6' : '#233148',
              color: viewMode === 'slider' ? '#93c5fd' : '#94a3b8'
            }}
          >
            🔄 Interactive Slider
          </button>
          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className="btn btn-sm"
            style={{
              padding: '4px 10px',
              fontSize: '0.72rem',
              borderRadius: '6px',
              backgroundColor: viewMode === 'side-by-side' ? '#1e3a8a' : '#0c1222',
              borderColor: viewMode === 'side-by-side' ? '#3b82f6' : '#233148',
              color: viewMode === 'side-by-side' ? '#93c5fd' : '#94a3b8'
            }}
          >
            📊 Side-by-Side
          </button>
        </div>
      </div>

      {viewMode === 'slider' ? (
        /* Interactive Split Slider */
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          style={{
            position: 'relative',
            width: '100%',
            height: '360px',
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: 'ew-resize',
            userSelect: 'none',
            border: '1px solid #233148',
            backgroundColor: '#070b14'
          }}
        >
          {/* After Image (Background Layer) */}
          <img
            src={afterImage}
            alt="After Execution"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none'
            }}
          />

          {/* Before Image (Clipped Overlay Layer) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
              overflow: 'hidden',
              pointerEvents: 'none'
            }}
          >
            <img
              src={beforeImage}
              alt="Before Entry"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Divider Line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${sliderPos}%`,
              width: '2px',
              backgroundColor: '#38bdf8',
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.8)',
              zIndex: 10
            }}
          >
            {/* Center Drag Handle */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#0c1326',
                border: '2px solid #38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.8)',
                cursor: 'ew-resize'
              }}
            >
              <Columns size={16} color="#38bdf8" />
            </div>
          </div>

          {/* Left Label (Before) */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#93c5fd',
              fontSize: '0.72rem',
              fontWeight: 700,
              zIndex: 15,
              pointerEvents: 'none',
              backdropFilter: 'blur(4px)'
            }}
          >
            {beforeLabel}
          </div>

          {/* Right Label (After) */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: '0.72rem',
              fontWeight: 700,
              zIndex: 15,
              pointerEvents: 'none',
              backdropFilter: 'blur(4px)'
            }}
          >
            {afterLabel}
          </div>
        </div>
      ) : (
        /* Side-by-Side Mode */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #233148', backgroundColor: '#070b14' }}>
            <div style={{ padding: '8px 12px', backgroundColor: '#0c1222', borderBottom: '1px solid #1e293b', fontSize: '0.74rem', fontWeight: 700, color: '#93c5fd' }}>
              {beforeLabel}
            </div>
            <img 
              src={beforeImage} 
              alt="Before" 
              onClick={() => setFullscreenImage(beforeImage)}
              style={{ width: '100%', height: '220px', objectFit: 'contain', cursor: 'zoom-in', padding: '6px' }} 
            />
          </div>

          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #233148', backgroundColor: '#070b14' }}>
            <div style={{ padding: '8px 12px', backgroundColor: '#0c1222', borderBottom: '1px solid #1e293b', fontSize: '0.74rem', fontWeight: 700, color: '#34d399' }}>
              {afterLabel}
            </div>
            <img 
              src={afterImage} 
              alt="After" 
              onClick={() => setFullscreenImage(afterImage)}
              style={{ width: '100%', height: '220px', objectFit: 'contain', cursor: 'zoom-in', padding: '6px' }} 
            />
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {fullscreenImage && (
        <div
          onClick={() => setFullscreenImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.92)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="btn btn-ghost btn-icon"
            style={{ position: 'absolute', top: '20px', right: '20px', color: 'white' }}
          >
            <X size={24} />
          </button>
          <img
            src={fullscreenImage}
            alt="Fullscreen Chart"
            style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>
      )}
    </div>
  );
};
