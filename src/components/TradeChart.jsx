import { useState, useEffect, useRef } from 'react';
import { getTVSymbol, getTVTheme, buildTVWidgetURL } from '../lib/symbolMap';
import { supabase } from '../lib/supabase';

const TIMEFRAMES = [
  { label: '1M', value: '1' },
  { label: '3M', value: '3' },
  { label: '5M', value: '5' },
  { label: '15M', value: '15' },
  { label: '30M', value: '30' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: 'D', value: 'D' }
];

function formatTradeDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return '-';
  }
}

function formatTradeTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '-';
  return timeStr.substring(0, 5) + ' IST';
}

function formatPnl(pnl) {
  if (pnl > 0) return '+₹' + Math.abs(pnl).toLocaleString('en-IN');
  if (pnl < 0) return '-₹' + Math.abs(pnl).toLocaleString('en-IN');
  return '₹0';
}

function getPnlColor(pnl) {
  if (pnl > 0) return '#22c55e';
  if (pnl < 0) return '#ef4444';
  return 'var(--text)';
}

export default function TradeChart({ trade, userTheme }) {
  const normalChartRef = useRef(null);
  const maximizeChartRef = useRef(null);

  const [interval, setActiveInterval] = useState('5');
  const [isMaximized, setIsMaximized] = useState(false);
  const [capturedFile, setCapturedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [captureError, setCaptureError] = useState(null);

  const tvSymbol = getTVSymbol(trade?.symbol || '');
  const tvTheme = getTVTheme(userTheme);
  const widgetUrl = buildTVWidgetURL(tvSymbol, interval, tvTheme);
  const isIndianMarket = tvSymbol.startsWith('NSE:') || tvSymbol.startsWith('BSE:');
  const tvWebUrl = 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(tvSymbol);
  const entryPrice = trade?.entry_price ?? null;
  const exitPrice = trade?.exit_price ?? null;
  const pnl = trade?.pnl ?? 0;

  let hintText = '💡 Press Ctrl+G on chart to go to ' + formatTradeDate(trade?.date);
  if (entryPrice !== null) {
    hintText += ' · Entry at ' + Number(entryPrice).toFixed(2);
  }
  if (exitPrice !== null) {
    hintText += ' · Exit at ' + Number(exitPrice).toFixed(2);
  }
  hintText += ' · Use TradingView horizontal line drawing tool';

  const handleCapturedImage = (blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setCapturedFile(blob);
    setUploadSuccess(false);
    setShowReplaceConfirm(false);
    setCaptureError(null);
  };

  async function captureScreenshot(containerRef) {
    setCaptureError(null);

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setCaptureError('Screen capture not supported in this browser. Use Ctrl+V paste instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 },
        preferCurrentTab: true
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      await new Promise(resolve => setTimeout(resolve, 400));

      stream.getTracks().forEach(track => track.stop());

      const container = containerRef?.current;
      if (!container) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.toBlob(blob => {
          if (blob) handleCapturedImage(blob);
        }, 'image/png');
        return;
      }

      const rect = container.getBoundingClientRect();
      const scaleX = video.videoWidth / window.innerWidth;
      const scaleY = video.videoHeight / window.innerHeight;

      const srcX = Math.round(Math.max(0, rect.left * scaleX));
      const srcY = Math.round(Math.max(0, rect.top * scaleY));
      const srcW = Math.round(Math.min(rect.width * scaleX, video.videoWidth - srcX));
      const srcH = Math.round(Math.min(rect.height * scaleY, video.videoHeight - srcY));

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = srcW;
      cropCanvas.height = srcH;
      const ctx = cropCanvas.getContext('2d');
      ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

      cropCanvas.toBlob(blob => {
        if (blob) handleCapturedImage(blob);
      }, 'image/png');

    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        return;
      }
      setCaptureError('Capture failed. Use Ctrl+V paste as alternative.');
    }
  }

  async function uploadScreenshot() {
    if (!capturedFile || !trade?.id) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUploading(false);
        return;
      }

      const fileExt = capturedFile.type?.includes('png') ? 'png' : 'jpg';
      const filePath = user.id + '/chart-screenshots/' + trade.id + '-' + Date.now() + '.' + fileExt;

      const { error: uploadError } = await supabase.storage
        .from('trade-media')
        .upload(filePath, capturedFile, { upsert: true });

      if (uploadError) {
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('trade-media')
        .getPublicUrl(filePath);

      await supabase.from('trades').update({ chart_image_url: publicUrl }).eq('id', trade.id);

      setUploading(false);
      setUploadSuccess(true);
      setCapturedFile(null);
      setPreviewUrl(null);
      setShowReplaceConfirm(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
      setUploading(false);
    }
  }

  const handleAttachClick = () => {
    if (trade?.chart_image_url) {
      setShowReplaceConfirm(true);
    } else {
      uploadScreenshot();
    }
  };

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleCapturedImage(blob);
            break;
          }
        }
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsMaximized(false);
    };
    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('keydown', handleEscape);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const renderTimeframeButtons = (isDark = false) => {
    return (
      <div style={{ overflowX: 'auto', display: 'flex', gap: '4px' }}>
        {TIMEFRAMES.map((tf) => {
          const isActive = interval === tf.value;
          let btnStyle;
          if (isDark) {
            btnStyle = isActive ? {
              background: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '3px 9px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              outline: 'none'
            } : {
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
              border: '0.5px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              padding: '3px 9px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              outline: 'none'
            };
          } else {
            btnStyle = isActive ? {
              background: 'var(--accent-muted)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              borderRadius: '6px',
              padding: '3px 9px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              outline: 'none'
            } : {
              background: 'transparent',
              color: 'var(--text-sub)',
              border: '0.5px solid var(--border)',
              borderRadius: '6px',
              padding: '3px 9px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              outline: 'none'
            };
          }

          return (
            <button
              key={tf.value}
              type="button"
              onClick={() => setActiveInterval(tf.value)}
              style={btnStyle}
            >
              {tf.label}
            </button>
          );
        })}
      </div>
    );
  };

  const renderIndianNotice = (isDark = false) => {
    return (
      <div style={{
        background: isDark ? 'rgba(255,255,255,0.04)' : 'var(--card)',
        border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'var(--border)'}`,
        borderRadius: '8px',
        overflow: 'hidden',
        height: isDark ? '100%' : undefined,
        display: isDark ? 'flex' : undefined,
        flexDirection: isDark ? 'column' : undefined
      }}>
        {/* ROW 1 — Notice bar at the top */}
        <div style={{
          background: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)',
          borderBottom: `0.5px solid ${isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.2)'}`,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.85)' : 'var(--text-sub)', lineHeight: 1.5 }}>
            NSE/BSE charts require a TradingView account. The free embedded chart cannot display Indian market data without login.
          </span>
        </div>

        {/* ROW 2 — Action area */}
        <div style={{
          padding: '20px 14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          minHeight: '180px',
          justifyContent: 'center',
          flex: isDark ? 1 : undefined
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 700,
            color: isDark ? '#ffffff' : 'var(--text)',
            background: isDark ? 'rgba(255,255,255,0.08)' : 'var(--bg)',
            border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'var(--border)'}`,
            borderRadius: '6px',
            padding: '4px 12px',
            marginBottom: '4px'
          }}>
            {tvSymbol}
          </div>
          
          <div style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.7)' : 'var(--text-sub)', textAlign: 'center' }}>
            View this chart on TradingView website
          </div>

          <a
            href={tvWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--accent)',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Open {tvSymbol} on TradingView ↗
          </a>

          <div style={{ fontSize: '10px', color: isDark ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
            Opens in a new tab · Free TradingView account required for NSE data
          </div>
        </div>
      </div>
    );
  };

  const renderPasteZone = (isDarkContext = false) => {
    const handleDrop = (e) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file && file.type.startsWith('image/')) {
          handleCapturedImage(file);
        }
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    const zoneBg = isDarkContext ? 'rgba(255,255,255,0.06)' : 'var(--bg)';
    const zoneBorder = isDarkContext ? '1.5px dashed rgba(255,255,255,0.2)' : '1.5px dashed var(--border)';
    const textColor = isDarkContext ? '#ffffff' : 'var(--text)';
    const textSubColor = isDarkContext ? 'rgba(255,255,255,0.8)' : 'var(--text-sub)';
    const textMutedColor = isDarkContext ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)';

    let content;
    if (uploadSuccess) {
      content = (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: '22px', color: '#22c55e', fontWeight: 'bold' }}>✓</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e' }}>Screenshot attached to this trade</div>
          <div style={{ fontSize: '11px', color: textMutedColor, marginTop: '4px' }}>Refreshing page...</div>
        </div>
      );
    } else if (showReplaceConfirm) {
      content = (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: textSubColor, marginBottom: '10px' }}>
            A screenshot already exists. Replace it?
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setShowReplaceConfirm(false);
                uploadScreenshot();
              }}
              style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}
            >
              Replace
            </button>
            <button
              onClick={() => {
                setShowReplaceConfirm(false);
                setCapturedFile(null);
                setPreviewUrl(null);
              }}
              style={{ background: 'transparent', border: `0.5px solid ${isDarkContext ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`, borderRadius: '6px', padding: '6px 14px', fontSize: '12px', color: textSubColor, cursor: 'pointer' }}
            >
              Keep existing
            </button>
          </div>
        </div>
      );
    } else if (capturedFile) {
      content = (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <img
            src={previewUrl}
            alt="Preview"
            style={{ width: '90px', height: '64px', objectFit: 'cover', borderRadius: '4px', border: `0.5px solid ${isDarkContext ? 'rgba(255,255,255,0.2)' : 'var(--border)'}` }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: textColor }}>Chart screenshot ready</div>
            <div style={{ fontSize: '11px', color: textSubColor }}>Click Attach to save to this trade</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleAttachClick}
                disabled={uploading}
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  opacity: uploading ? 0.6 : 1,
                  cursor: uploading ? 'not-allowed' : 'pointer'
                }}
              >
                {uploading ? 'Uploading...' : 'Attach to trade'}
              </button>
              <button
                onClick={() => {
                  setCapturedFile(null);
                  setPreviewUrl(null);
                  setUploadSuccess(false);
                }}
                style={{ background: 'transparent', border: `0.5px solid ${isDarkContext ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`, borderRadius: '6px', padding: '7px 12px', fontSize: '12px', color: textSubColor, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      content = (
        <div style={{ textAlign: 'center', userSelect: 'none', color: textSubColor }}>
          {captureError && (
            <div style={{ color: '#f59e0b', fontSize: '11px', textAlign: 'center', marginBottom: '6px' }}>
              {captureError}
            </div>
          )}
          <div style={{ fontSize: '12px', marginBottom: '5px' }}>
            📷 Click the camera button on the chart or paste a screenshot (Ctrl+V)
          </div>
          <div style={{ fontSize: '11px', color: textMutedColor }}>
            Drag and drop a file here also works
          </div>
        </div>
      );
    }

    return (
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          marginTop: '10px',
          border: zoneBorder,
          borderRadius: '8px',
          padding: '12px 14px',
          backgroundColor: zoneBg,
          color: textColor,
          flexShrink: isDarkContext ? 0 : undefined
        }}
      >
        {content}
      </div>
    );
  };

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `
        .tl-chart-iframe { height: 400px; width: 100%; display: block; border-radius: 8px; border: 0.5px solid var(--border); }
        .tl-chart-navgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        @media (max-width: 768px) {
          .tl-chart-iframe { height: 280px !important; }
          .tl-chart-navgrid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}} />

      {/* NORMAL VIEW */}
      {!isMaximized && (
        <>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              TRADE CHART
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setIsMaximized(true)}
                title="Expand chart"
                style={{
                  background: 'var(--card)',
                  border: '0.5px solid var(--border)',
                  borderRadius: '6px',
                  padding: '4px 9px',
                  cursor: 'pointer',
                  color: 'var(--text-sub)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 500
                }}
              >
                ⛶ Expand
              </button>
              {renderTimeframeButtons(false)}
            </div>
          </div>

          {/* Chart Area */}
          <div ref={normalChartRef} style={{ position: 'relative' }}>
            {isIndianMarket ? (
              renderIndianNotice(false)
            ) : (
              <iframe
                key={tvSymbol + '-' + interval}
                className="tl-chart-iframe"
                src={widgetUrl}
                frameBorder={0}
                allowTransparency={true}
                scrolling="no"
                title={tvSymbol + ' Chart'}
              />
            )}

            {/* CAMERA BUTTON (Floating) */}
            {!isIndianMarket && (
              <button
                type="button"
                title="Capture chart screenshot"
                onClick={(e) => {
                  e.stopPropagation();
                  captureScreenshot(normalChartRef);
                }}
                style={{
                  position: 'absolute',
                  bottom: '14px',
                  right: '14px',
                  zIndex: 10,
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                }}
              >
                <span style={{ fontSize: '18px' }}>📷</span>
              </button>
            )}
          </div>

          {/* PASTE ZONE */}
          {renderPasteZone(false)}

          {/* Navigation Panel */}
          <div style={{ marginTop: '12px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '12px 14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '10px' }}>
              📍 Navigate to your trade
            </span>

            <div className="tl-chart-navgrid">
              {/* Box 1 */}
              <div style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '8px 10px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                  DATE
                </span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  {formatTradeDate(trade?.date)}
                </div>
              </div>

              {/* Box 2 */}
              <div style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '8px 10px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                  ENTRY TIME
                </span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  {formatTradeTime(trade?.entry_time)}
                </div>
              </div>

              {/* Box 3 */}
              <div style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '8px 10px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                  ENTRY PRICE
                </span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  {entryPrice !== null ? Number(entryPrice).toFixed(2) : '-'}
                </div>
              </div>

              {/* Box 4 */}
              <div style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '8px 10px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                  EXIT TIME
                </span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  {formatTradeTime(trade?.exit_time ?? null)}
                </div>
              </div>

              {/* Box 5 */}
              <div style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '8px 10px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                  EXIT PRICE
                </span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  {exitPrice !== null ? Number(exitPrice).toFixed(2) : '-'}
                </div>
              </div>

              {/* Box 6 */}
              <div style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '8px 10px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                  P&L
                </span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: getPnlColor(pnl) }}>
                  {formatPnl(pnl)}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5, marginTop: '10px', margin: '10px 0 0 0' }}>
              {hintText}
            </p>
          </div>
        </>
      )}

      {/* MAXIMIZED VIEW MODAL */}
      {isMaximized && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.92)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.3px' }}>
              TRADE CHART · {tvSymbol}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {renderTimeframeButtons(true)}
              <button
                type="button"
                onClick={() => setIsMaximized(false)}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  border: '0.5px solid rgba(255,255,255,0.25)',
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
          </div>

          {/* Chart area */}
          <div ref={maximizeChartRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            {isIndianMarket ? (
              renderIndianNotice(true)
            ) : (
              <iframe
                key={tvSymbol + '-max-' + interval}
                src={widgetUrl}
                style={{ width: '100%', height: '100%', display: 'block', borderRadius: '8px', border: 'none' }}
                frameBorder={0}
                allowTransparency={true}
                scrolling="no"
                title={tvSymbol + ' Chart'}
              />
            )}

            {/* CAMERA BUTTON (floating corner) */}
            {!isIndianMarket && (
              <button
                type="button"
                title="Capture chart screenshot"
                onClick={(e) => {
                  e.stopPropagation();
                  captureScreenshot(maximizeChartRef);
                }}
                style={{
                  position: 'absolute',
                  bottom: '14px',
                  right: '14px',
                  zIndex: 10,
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                }}
              >
                <span style={{ fontSize: '18px' }}>📷</span>
              </button>
            )}
          </div>

          {/* PASTE ZONE */}
          {renderPasteZone(true)}
        </div>
      )}
    </div>
  );
}
