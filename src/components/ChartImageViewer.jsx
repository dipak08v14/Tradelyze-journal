import React, { useState, useEffect, useRef, useCallback } from 'react';

const TOOLS = [
  { id: 'freehand', label: 'Pencil', symbol: '✏' },
  { id: 'hline', label: 'H-Line', symbol: '—' },
  { id: 'line', label: 'Trend', symbol: '╱' },
  { id: 'rect', label: 'Rectangle', symbol: '▭' },
  { id: 'arrow', label: 'Arrow', symbol: '→' },
  { id: 'text', label: 'Text', symbol: 'T' }
];

const COLOR_PRESETS = ['#06b6d4', '#ef4444', '#22c55e', '#f59e0b', '#ffffff', '#a855f7'];

const LINE_WIDTHS = [1, 2, 4];

export default function ChartImageViewer({ imageUrl, onClose }) {
  const [activeTool, setActiveTool] = useState('freehand');
  const [activeColor, setActiveColor] = useState('#06b6d4');
  const [lineWidth, setLineWidth] = useState(2);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [textInput, setTextInput] = useState(null); // null or { screenX, screenY, canvasX, canvasY }
  const [textValue, setTextValue] = useState('');

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef(null);
  const baseStateRef = useRef(null);

  const getCanvasPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = activeColor;
    ctx.fillStyle = activeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  }, [activeColor, lineWidth]);

  const saveToUndoStack = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack(prev => [...prev.slice(-19), imageData]);
    setRedoStack([]);
  }, []);

  const captureBaseState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  const restoreImageData = useCallback((imageData) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
  }, []);

  const drawArrow = useCallback((ctx, x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = Math.max(12, lineWidth * 4);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLen * Math.cos(angle - Math.PI / 6),
      y2 - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - headLen * Math.cos(angle + Math.PI / 6),
      y2 - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }, [lineWidth]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setRedoStack(prev => [...prev.slice(-19), currentState]);
    const prevState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    restoreImageData(prevState);
  }, [undoStack, restoreImageData]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack(prev => [...prev.slice(-19), currentState]);
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    restoreImageData(nextState);
  }, [redoStack, restoreImageData]);

  const clear = useCallback(() => {
    saveToUndoStack();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [saveToUndoStack]);

  const handleImageLoad = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const rect = img.getBoundingClientRect();
    canvas.width = Math.round(rect.width);
    canvas.height = Math.round(rect.height);
  };

  const handleMouseDown = (e) => {
    if (activeTool === 'text') {
      const pt = getCanvasPoint(e);
      setTextInput({
        screenX: e.clientX,
        screenY: e.clientY,
        canvasX: pt.x,
        canvasY: pt.y
      });
      setTextValue('');
      return;
    }
    isDrawingRef.current = true;
    startPointRef.current = getCanvasPoint(e);
    if (activeTool === 'freehand') {
      saveToUndoStack();
      const ctx = getCtx();
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(startPointRef.current.x, startPointRef.current.y);
      }
    } else {
      baseStateRef.current = captureBaseState();
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawingRef.current) return;
    const p = getCanvasPoint(e);
    const start = startPointRef.current;
    const ctx = getCtx();
    if (!ctx || !start) return;

    if (activeTool === 'freehand') {
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else {
      if (baseStateRef.current) {
        restoreImageData(baseStateRef.current);
      }
      if (activeTool === 'hline') {
        const canvas = canvasRef.current;
        if (canvas) {
          ctx.beginPath();
          ctx.moveTo(0, start.y);
          ctx.lineTo(canvas.width, start.y);
          ctx.stroke();
        }
      } else if (activeTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else if (activeTool === 'rect') {
        ctx.strokeRect(start.x, start.y, p.x - start.x, p.y - start.y);
      } else if (activeTool === 'arrow') {
        drawArrow(ctx, start.x, start.y, p.x, p.y);
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (activeTool !== 'freehand' && baseStateRef.current) {
      const base = baseStateRef.current;
      setUndoStack(prev => [...prev.slice(-19), base]);
      setRedoStack([]);
      baseStateRef.current = null;
    }
    startPointRef.current = null;
  };

  const confirmText = () => {
    if (!textInput || !textValue.trim()) return;
    saveToUndoStack();
    const ctx = getCtx();
    if (ctx) {
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillText(textValue, textInput.canvasX, textInput.canvasY);
    }
    setTextInput(null);
    setTextValue('');
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (textInput) {
          setTextInput(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo, textInput, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.96)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {/* ROW 1 — Toolbar */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          borderBottom: '0.5px solid rgba(255,255,255,0.1)',
          flexWrap: 'wrap'
        }}
      >
        {/* Tool buttons group */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {TOOLS.map((t) => {
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTool(t.id);
                  if (textInput) setTextInput(null);
                }}
                style={{
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--accent)' : 'rgba(255,182,193,0.08)',
                  background: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                  border: isActive ? 'none' : '0.5px solid rgba(255,255,255,0.15)'
                }}
              >
                {t.symbol} {t.label}
              </button>
            );
          })}
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Color presets */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {COLOR_PRESETS.map((color) => {
            const isSelected = activeColor === color;
            return (
              <button
                key={color}
                onClick={() => setActiveColor(color)}
                style={{
                  width: '22px',
                  height: '22px',
                  background: color,
                  border: isSelected ? '2px solid #fff' : '2px solid transparent',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  padding: 0
                }}
              />
            );
          })}
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Line width buttons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {LINE_WIDTHS.map((w) => {
            const isActive = lineWidth === w;
            return (
              <button
                key={w}
                onClick={() => setLineWidth(w)}
                style={{
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  border: isActive ? '0.5px solid rgba(255,255,255,0.4)' : '0.5px solid rgba(255,255,255,0.15)'
                }}
              >
                <div
                  style={{
                    height: `${w}px`,
                    background: '#fff',
                    width: '24px',
                    borderRadius: '2px'
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            disabled={undoStack.length === 0}
            onClick={undo}
            style={{
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer',
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              opacity: undoStack.length === 0 ? 0.35 : 1
            }}
          >
            ↩ Undo
          </button>
          <button
            disabled={redoStack.length === 0}
            onClick={redo}
            style={{
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer',
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              opacity: redoStack.length === 0 ? 0.35 : 1
            }}
          >
            ↪ Redo
          </button>
          <button
            onClick={clear}
            className="hover:bg-[rgba(239,68,68,0.8)] hover:text-white transition-colors"
            style={{
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              textShadow: '0 0 1px'
            }}
          >
            ⊘ Clear
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            border: '0.5px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            padding: '5px 14px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* ROW 2 — Image + Canvas area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: '16px'
        }}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            ref={imageRef}
            src={imageUrl}
            onLoad={handleImageLoad}
            referrerPolicy="no-referrer"
            alt="Chart execution screenshot"
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              cursor: activeTool === 'text' ? 'text' : 'crosshair'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          {/* Text input overlay */}
          {textInput && (
            <div
              style={{
                position: 'fixed',
                left: `${textInput.screenX}px`,
                top: `${textInput.screenY}px`,
                zIndex: 10001
              }}
            >
              <input
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    confirmText();
                  } else if (e.key === 'Escape') {
                    setTextInput(null);
                  }
                }}
                autoFocus
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--accent)',
                  color: activeColor,
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  minWidth: '100px',
                  padding: '2px 4px'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ROW 3 — Bottom hint */}
      <div
        style={{
          flexShrink: 0,
          textAlign: 'center',
          padding: '6px',
          fontSize: '10px',
          color: 'rgba(255,255,255,0.3)'
        }}
      >
        Drawings are temporary · Close or press Esc to exit · Ctrl+Z undo · Ctrl+Y redo
      </div>
    </div>
  );
}
