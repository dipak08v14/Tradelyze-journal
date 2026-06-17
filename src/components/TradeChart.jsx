import { useState, useEffect, useRef } from 'react';
import { getTVSymbol, getTVTheme, buildTVWidgetURL } from '../lib/symbolMap';
import { supabase } from '../lib/supabase';
import { createChart, ColorType } from 'lightweight-charts';
import { getYahooSymbol, getYahooInterval, canFetchIntraday } from '../lib/yahooSymbolMap';

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
  const [interval, setActiveInterval] = useState('5');
  const [isMaximized, setIsMaximized] = useState(false);
  const [capturedFile, setCapturedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const iframeRef = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);
  const [dataLimitedToDaily, setDataLimitedToDaily] = useState(false);
  const indianChartContainerRef = useRef(null);
  const lwChartRef = useRef(null);
  const lwSeriesRef = useRef(null);

  function getTradeTimeRange(date, entryTime) {
    if (!date || typeof date !== 'string') return { from: null, to: null }

    let timeStr = '09:00:00'
    if (entryTime && typeof entryTime === 'string' && entryTime.length >= 4) {
      if (entryTime.length === 5) {
        timeStr = entryTime + ':00'
      } else {
        timeStr = entryTime.substring(0, 8)
      }
    }

    const isoString = date + 'T' + timeStr + '+05:30'
    const dt = new Date(isoString)

    if (isNaN(dt.getTime())) return { from: null, to: null }

    const epochMs = dt.getTime()
    return {
      from: Math.round((epochMs - 3 * 60 * 60 * 1000) / 1000),
      to:   Math.round((epochMs + 6 * 60 * 60 * 1000) / 1000)
    }
  }

  const { from: chartFrom, to: chartTo } = getTradeTimeRange(trade?.date, trade?.entry_time)
  const tvSymbol = getTVSymbol(trade?.symbol || '');
  const tvTheme = getTVTheme(userTheme);
  const widgetUrl = buildTVWidgetURL(tvSymbol, interval, tvTheme, chartFrom, chartTo)
  const isIndianMarket = tvSymbol.startsWith('NSE:') || tvSymbol.startsWith('BSE:');
  const tvWebUrl = 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(tvSymbol);
  const entryPrice = trade?.entry_price ?? null;
  const exitPrice = trade?.exit_price ?? null;
  const pnl = trade?.pnl ?? 0;

  const fetchIndianChartData = async (yahooSymbol, yahooInterval, from, to) => {
    setChartLoading(true);
    setChartError(null);
    setDataLimitedToDaily(false);

    try {
      let url = '/api/chart-data?symbol=' + encodeURIComponent(yahooSymbol) +
                '&interval=' + yahooInterval;

      if (from && to) {
        url += '&from=' + from + '&to=' + to;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        if (data.note && data.note.includes('60 days')) {
          setDataLimitedToDaily(true);
          const dailyUrl = '/api/chart-data?symbol=' + encodeURIComponent(yahooSymbol) + '&interval=1d';
          const dailyResponse = await fetch(dailyUrl);
          const dailyData = await dailyResponse.json();
          if (dailyResponse.ok && dailyData.candles?.length > 0) {
            setChartData(dailyData.candles);
          } else {
            setChartError('Chart data not available for this trade date.');
          }
        } else {
          setChartError(data.error || 'Failed to load chart data.');
        }
      } else {
        setChartData(data.candles || []);
      }
    } catch (err) {
      setChartError('Network error loading chart: ' + err.message);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    if (!isIndianMarket) return;

    const yahooSymbol = getYahooSymbol(tvSymbol);
    if (!yahooSymbol) {
      setChartError('No Yahoo Finance symbol mapping found for ' + tvSymbol);
      return;
    }

    const canIntraday = canFetchIntraday(trade?.date, interval);
    const effectiveInterval = canIntraday ? getYahooInterval(interval) : '1d';

    if (!canIntraday) {
      setDataLimitedToDaily(true);
    }

    if (chartFrom && chartTo && canIntraday) {
      const extendedFrom = chartFrom - (2 * 60 * 60);
      const extendedTo = chartTo + (2 * 60 * 60);
      fetchIndianChartData(yahooSymbol, effectiveInterval, extendedFrom, extendedTo);
    } else {
      fetchIndianChartData(yahooSymbol, effectiveInterval, null, null);
    }
  }, [isIndianMarket, tvSymbol, interval, chartFrom, chartTo]);

  useEffect(() => {
    if (!isIndianMarket || !indianChartContainerRef.current || !chartData || chartData.length === 0) return;

    const isDark = ['charcoal', 'navy', 'midnight'].includes(userTheme);

    const chart = createChart(indianChartContainerRef.current, {
      width: indianChartContainerRef.current.clientWidth,
      height: indianChartContainerRef.current.clientHeight || 400,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0e0f16' : '#ffffff' },
        textColor: isDark ? '#e2e8f0' : '#1c1917',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
        horzLines: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      },
      timeScale: {
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    candleSeries.setData(chartData);

    if (chartFrom && chartTo) {
      chart.timeScale().setVisibleRange({
        from: chartFrom - (1 * 60 * 60),
        to: chartTo + (3 * 60 * 60)
      });
    }

    lwChartRef.current = chart;
    lwSeriesRef.current = candleSeries;

    const resizeObserver = new ResizeObserver(() => {
      if (indianChartContainerRef.current && lwChartRef.current) {
        lwChartRef.current.applyOptions({
          width: indianChartContainerRef.current.clientWidth,
          height: indianChartContainerRef.current.clientHeight || 400,
        });
      }
    });
    resizeObserver.observe(indianChartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      lwChartRef.current = null;
      lwSeriesRef.current = null;
    };
  }, [chartData, userTheme, isIndianMarket]);

  const handleCapturedImage = (blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setCapturedFile(blob);
    setUploadSuccess(false);
    setShowReplaceConfirm(false);
  };

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
        <div style={{ textAlign: 'center', userSelect: 'none', color: isDarkContext ? 'rgba(255,255,255,0.5)' : textSubColor }}>
          <div style={{ fontSize: '12px', marginBottom: '5px' }}>
            {isDarkContext ? 'Drag downloaded chart here or Ctrl+V' : '📋 Paste a screenshot (Ctrl+V) or drag and drop a file here'}
          </div>
          {!isDarkContext && (
            <div style={{ fontSize: '11px', color: textMutedColor }}>
              Drag and drop a file here also works
            </div>
          )}
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
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .tl-chart-iframe { height: 280px !important; }
          .tl-chart-navgrid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}} />

      {/* Header Row */}
      {!isMaximized && (
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
            {trade?.date && (
              <button
                type="button"
                onClick={() => {
                  if (!iframeRef.current || !chartFrom || !chartTo) return;
                  const newUrl = buildTVWidgetURL(tvSymbol, interval, tvTheme, chartFrom, chartTo);
                  iframeRef.current.src = newUrl;
                }}
                disabled={!chartFrom || !chartTo}
                title={"Jump chart to " + formatTradeDate(trade?.date) + " at " + formatTradeTime(trade?.entry_time)}
                style={{
                  background: 'var(--accent-muted)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  borderRadius: '7px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: (!chartFrom || !chartTo) ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  opacity: (!chartFrom || !chartTo) ? 0.4 : 1
                }}
              >
                📅 {formatTradeDate(trade?.date)}
              </button>
            )}
            {renderTimeframeButtons(false)}
          </div>
        </div>
      )}

      {/* Chart Container Div (Becomes fullscreen when maximized) */}
      <div style={{
        position: 'relative',
        ...(isMaximized ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.95)',
          padding: '12px 16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column'
        } : {})
      }}>
        {/* Maximize Header */}
        {isMaximized && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
            <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, letterSpacing: '0.3px', fontFamily: '"Inter", sans-serif' }}>
              {'TRADE CHART · ' + tvSymbol}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.value}
                  type="button"
                  onClick={() => setActiveInterval(tf.value)}
                  style={{
                    borderRadius: 6,
                    padding: '3px 9px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    outline: 'none',
                    background: interval === tf.value ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                    color: interval === tf.value ? '#ffffff' : 'rgba(255,255,255,0.7)',
                    border: interval === tf.value ? 'none' : '0.5px solid rgba(255,255,255,0.2)'
                  }}
                >{tf.label}</button>
              ))}
              <button
                type="button"
                onClick={() => setIsMaximized(false)}
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '0.5px solid rgba(255,255,255,0.25)', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 4 }}
              >✕ Close</button>
            </div>
          </div>
        )}

        {/* Chart Content */}
        {isIndianMarket ? (
          <div
            className="tl-chart-iframe"
            style={{
              border: '0.5px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
              position: 'relative',
              background: 'var(--card)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: isMaximized ? '100%' : '400px',
              height: isMaximized ? '100%' : '400px',
              width: '100%',
              flex: isMaximized ? 1 : undefined
            }}
          >
            {chartLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '8px' }}>
                  {"Loading " + (tvSymbol.split(':')[1] || tvSymbol) + " chart..."}
                </div>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    border: '3px solid var(--bar)',
                    borderTop: '3px solid var(--accent)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto'
                  }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Fetching from Yahoo Finance...
                </div>
              </div>
            ) : chartError ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{ fontSize: '12px', color: '#f59e0b', marginBottom: '12px' }}>
                  {"⚠ " + chartError}
                </div>
                <a
                  href={'https://in.tradingview.com/chart/?symbol=' + tvSymbol}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    background: 'var(--accent)',
                    color: '#fff',
                    borderRadius: '7px',
                    padding: '7px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  {"Open " + tvSymbol + " on TradingView ↗"}
                </a>
              </div>
            ) : chartData ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {dataLimitedToDaily && (
                  <div style={{ background: 'rgba(245,158,11,0.1)', borderBottom: '0.5px solid rgba(245,158,11,0.2)', padding: '6px 12px', fontSize: '11px', color: '#92400e', textAlign: 'center', width: '100%', flexShrink: 0 }}>
                    Showing daily candles — intraday data not available for trades older than 60 days
                  </div>
                )}
                <div
                  ref={indianChartContainerRef}
                  style={{ width: '100%', flex: 1, minHeight: 0 }}
                />
              </div>
            ) : (
              <div
                ref={indianChartContainerRef}
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            key={tvSymbol + '-' + interval}
            className={isMaximized ? undefined : 'tl-chart-iframe'}
            style={isMaximized ? { flex: 1, width: '100%', border: 'none', borderRadius: 8, minHeight: 0 } : { display: 'block', width: '100%', borderRadius: 8, border: '0.5px solid var(--border)' }}
            src={widgetUrl}
            frameBorder={0}
            allowTransparency={true}
            scrolling="no"
            title={tvSymbol + ' Chart'}
          />
        )}

        {/* Maximize Paste Zone */}
        {isMaximized && renderPasteZone(true)}
      </div>

      {/* Normal View Paste Zone */}
      {!isMaximized && renderPasteZone(false)}

      {!isMaximized && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, marginBottom: 8 }}>
          <a
            href={'https://in.tradingview.com/chart/?symbol=' + tvSymbol + '&interval=' + interval + (chartFrom ? '&from=' + chartFrom : '') + (chartTo ? '&to=' + chartTo : '')}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              background: 'var(--card)',
              border: '0.5px solid var(--border)',
              borderRadius: 7,
              padding: '5px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-sub)',
              cursor: 'pointer'
            }}
          >
            {"📅 Open " + formatTradeDate(trade?.date) + " chart on TradingView ↗"}
          </a>
        </div>
      )}

      {/* Navigation Panel */}
      {!isMaximized && (
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
                DIRECTION
              </span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                {trade?.direction ? (
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: trade.direction === 'LONG' ? '#22c55e' : trade.direction === 'SHORT' ? '#ef4444' : 'var(--text)',
                    background: trade.direction === 'LONG' ? 'rgba(34,197,94,0.12)' : trade.direction === 'SHORT' ? 'rgba(239,68,68,0.12)' : 'transparent'
                  }}>
                    {trade.direction}
                  </span>
                ) : (
                  '-'
                )}
              </div>
            </div>

            {/* Box 4 */}
            <div style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '8px 10px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                P&L
              </span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: getPnlColor(trade?.pnl ?? 0) }}>
                {formatPnl(trade?.pnl ?? 0)}
              </div>
            </div>

            {/* Box 5 */}
            <div style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '8px 10px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                HOLDING TIME
              </span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                {trade?.holding_time_mins && trade.holding_time_mins > 0 ? (
                  trade.holding_time_mins < 60 ? (
                    trade.holding_time_mins + ' mins'
                  ) : (
                    Math.floor(trade.holding_time_mins / 60) + 'h ' + (trade.holding_time_mins % 60) + 'm'
                  )
                ) : (
                  '-'
                )}
              </div>
            </div>

            {/* Box 6 */}
            <div style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '8px 10px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                POINTS / PIPS
              </span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                {trade?.points && Number(trade.points) !== 0 ? (
                  Number(trade.points).toFixed(2) + ' pts'
                ) : (
                  '-'
                )}
              </div>
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.6, marginTop: '10px', margin: '10px 0 0 0' }}>
            {"The chart above tries to load at " + formatTradeDate(trade?.date) + " · " + formatTradeTime(trade?.entry_time)}
            <br />
            {"If not at the right date, use the button above to open the full chart ↑"}
          </p>
        </div>
      )}
    </div>
  );
}
