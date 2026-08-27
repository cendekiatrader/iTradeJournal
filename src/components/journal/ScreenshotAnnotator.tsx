import React, { useRef, useState, useEffect } from 'react';
import { X, Type, PenTool, Square, Circle, ArrowRight, Eraser, Save, Undo } from 'lucide-react';

interface ScreenshotAnnotatorProps {
  imageUrl: string;
  onSave: (annotatedDataUrl: string) => void;
  onClose: () => void;
}

type ToolType = 'pen' | 'arrow' | 'rect' | 'circle' | 'text' | 'eraser';

export const ScreenshotAnnotator: React.FC<ScreenshotAnnotatorProps> = ({ imageUrl, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState('#3b82f6');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });

  // Load image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      // Max width 800px
      const scale = Math.min(1, 800 / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      saveToHistory();
    };
  }, [imageUrl]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.src = history[historyStep - 1];
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      setHistoryStep(historyStep - 1);
    }
  };

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    setStartPos(pos);
    setIsDrawing(true);

    if (tool === 'text') {
      setTextPos(pos);
      setShowTextInput(true);
      setTextInput('');
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || tool === 'text') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getMousePos(e);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    if (tool === 'pen') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.clearRect(pos.x - 10, pos.y - 10, 20, 20);
    }
  };

  const stopDrawing = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getMousePos(e);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    if (tool === 'rect') {
      const w = pos.x - startPos.x;
      const h = pos.y - startPos.y;
      ctx.strokeRect(startPos.x, startPos.y, w, h);
      saveToHistory();
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
      saveToHistory();
    } else if (tool === 'arrow') {
      drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y);
      saveToHistory();
    } else if (tool === 'pen') {
      saveToHistory();
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const addText = () => {
    if (!textInput.trim()) {
      setShowTextInput(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(textInput, textPos.x, textPos.y);
    setShowTextInput(false);
    setTextInput('');
    saveToHistory();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b',
        padding: '20px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto',
        display: 'flex', flexDirection: 'column', gap: '16px'
      }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'pen', icon: PenTool, label: 'Draw' },
              { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
              { id: 'rect', icon: Square, label: 'Box' },
              { id: 'circle', icon: Circle, label: 'Circle' },
              { id: 'text', icon: Type, label: 'Text' },
              { id: 'eraser', icon: Eraser, label: 'Erase' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id as ToolType)}
                style={{
                  padding: '8px 12px', borderRadius: '8px', border: '1px solid',
                  borderColor: tool === t.id ? '#3b82f6' : '#334155',
                  backgroundColor: tool === t.id ? 'rgba(59, 130, 246, 0.2)' : '#1e293b',
                  color: tool === t.id ? '#60a5fa' : '#94a3b8',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '0.8rem', fontWeight: 600
                }}
              >
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            />
            <button onClick={undo} disabled={historyStep <= 0} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#94a3b8', cursor: 'pointer', opacity: historyStep <= 0 ? 0.5 : 1 }}>
              <Undo size={16} />
            </button>
            <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
              <Save size={16} /> Save
            </button>
            <button onClick={onClose} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', backgroundColor: '#020617', borderRadius: '12px', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{ maxWidth: '100%', maxHeight: '60vh', cursor: tool === 'text' ? 'text' : 'crosshair' }}
          />
          {showTextInput && (
            <div style={{
              position: 'absolute',
              left: textPos.x, top: textPos.y,
              transform: 'translate(10px, -50%)',
              display: 'flex', gap: '4px'
            }}>
              <input
                autoFocus
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addText(); }}
                placeholder="Type label..."
                style={{
                  padding: '4px 8px', borderRadius: '4px', border: '1px solid #3b82f6',
                  backgroundColor: '#0f172a', color: '#fff', fontSize: '0.8rem'
                }}
              />
              <button onClick={addText} style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}>
                Add
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
