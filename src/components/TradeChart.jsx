import { useState, useEffect, useRef } from 'react';
import { getTVSymbol, getTVTheme, buildTVWidgetURL } from '../lib/symbolMap';
import { supabase } from '../lib/supabase';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries, BarSeries, createSeriesMarkers } from 'lightweight-charts';
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

const DRAWING_TOOLS = [
  { id: 'cursor',  label: 'Cursor',       icon: '✚' },
  { id: 'trend',   label: 'Trend line',   icon: '/' },
  { id: 'hline',   label: 'H-Line',       icon: '—' },
  { id: 'channel', label: 'Channel',      icon: '≡' },
  { id: 'fib',     label: 'Fib levels',   icon: '≡' },
  { id: 'arrow',   label: 'Arrow',        icon: '↗' },
  { id: 'text',    label: 'Text',         icon: 'T' },
  { id: 'shape',   label: 'Shapes',       icon: '□' },
  { id: 'brush',   label: 'Brush',        icon: '✏' },
  { id: 'eraser',  label: 'Eraser',       icon: '▢' },
  { id: 'zoom',    label: 'Zoom',         icon: '🔍' },
  { id: 'magnet',  label: 'Magnet',       icon: '🧲' },
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
  const lwVolumeRef = useRef(null);
  const markersRef = useRef(null);
  const [ohlcLegend, setOhlcLegend] = useState(null);
  const [chartType, setChartType] = useState('candle');

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

  const handleScreenshot = () => {
    if (!lwChartRef.current) return
    try {
      const canvas = lwChartRef.current.takeScreenshot()
      if (!canvas) return
      const symbolSlug = tvSymbol.replace(':', '_').replace(/[^a-zA-Z0-9_]/g, '')
      const link = document.createElement('a')
      link.download = 'tradelyze_' + symbolSlug + '_chart.png'
      link.href = canvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.warn('Chart screenshot failed:', e.message)
    }
  }

  useEffect(() => {
    if (!isIndianMarket || !chartData || chartData.length === 0) return
    const last = chartData[chartData.length - 1]
    setOhlcLegend({
      open:      Number(last.open).toFixed(2),
      high:      Number(last.high).toFixed(2),
      low:       Number(last.low).toFixed(2),
      close:     Number(last.close).toFixed(2),
      change:    (Number(last.close) - Number(last.open)).toFixed(2),
      changePct: ((Number(last.close) - Number(last.open)) / Number(last.open) * 100).toFixed(2),
      isUp:      Number(last.close) >= Number(last.open),
      volume:    last.volume || 0,
    })
  }, [isIndianMarket, chartData])

  const fetchIndianChartData = async (yahooSymbol, yahooInterval) => {
    setChartLoading(true);
    setChartError(null);
    setDataLimitedToDaily(false);

    try {
      const url = '/api/chart-data?symbol=' + encodeURIComponent(yahooSymbol) +
                  '&interval=' + yahooInterval;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        if (data.note && data.note.includes('60 days')) {
          setDataLimitedToDaily(true);
          const dailyUrl = '/api/chart-data?symbol=' + encodeURIComponent(yahooSymbol) + '&interval=1d';
          const dailyResponse = await fetch(dailyUrl);
          const dailyData = await dailyResponse.json();
          if (dailyResponse.ok && dailyData.candles?.length > 0) {
            const candles = dailyData.candles || [];
            const istCandles = candles.map(c => ({ ...c, time: c.time + 19800 }));
            setChartData(istCandles);
          } else {
            setChartError('Chart data not available for this trade date.');
          }
        } else {
          setChartError(data.error || 'Failed to load chart data.');
        }
      } else {
        const candles = data.candles || [];
        const istCandles = candles.map(c => ({ ...c, time: c.time + 19800 }));
        setChartData(istCandles);
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

    fetchIndianChartData(yahooSymbol, effectiveInterval);
  }, [isIndianMarket, tvSymbol, interval, chartFrom, chartTo]);

  useEffect(() => {
    if (!isIndianMarket || !indianChartContainerRef.current || !chartData || chartData.length === 0) return

    const chartIsDark = isMaximized || ['charcoal','navy','midnight'].includes(userTheme)
    const BG    = chartIsDark ? '#131722' : '#ffffff'
    const GRID  = chartIsDark ? 'rgba(42,46,57,0.5)' : 'rgba(42,46,57,0.06)'
    const BORDER= chartIsDark ? '#2a2e39' : '#e0e3eb'
    const TEXT  = chartIsDark ? '#b2b5be' : '#787b86'

    const chart = createChart(indianChartContainerRef.current, {
      width:  indianChartContainerRef.current.clientWidth,
      height: indianChartContainerRef.current.clientHeight || 400,
      layout: {
        background: { type: ColorType.Solid, color: BG },
        textColor: TEXT,
        fontSize: 11,
        fontFamily: "-apple-system,BlinkMacSystemFont,'Trebuchet MS',Roboto,Ubuntu,sans-serif",
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      rightPriceScale: {
        borderColor: BORDER,
        textColor: TEXT,
        scaleMargins: { top: 0.06, bottom: 0.18 },
      },
      timeScale: {
        borderColor: BORDER,
        textColor: TEXT,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 10,
        barSpacing: 6,
      },
      crosshair: {
        mode: 0,
        vertLine: { color: chartIsDark ? '#758696' : '#9598a1', width: 1, style: 1, labelBackgroundColor: chartIsDark ? '#363a45' : '#9598a1' },
         horzLine: { color: chartIsDark ? '#758696' : '#9598a1', width: 1, style: 1, labelBackgroundColor: chartIsDark ? '#363a45' : '#9598a1' },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale:  { mouseWheel: true, pinch: true },
    })

    let mainSeries
    if (chartType === 'line') {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#2196f3', lineWidth: 2, priceLineVisible: false, lastValueVisible: true,
      })
      mainSeries.setData(chartData.map(c => ({ time: c.time, value: c.close })))
    } else if (chartType === 'area') {
      mainSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(33,150,243,0.4)', bottomColor: 'rgba(33,150,243,0.0)',
        lineColor: '#2196f3', lineWidth: 2, priceLineVisible: false, lastValueVisible: true,
      })
      mainSeries.setData(chartData.map(c => ({ time: c.time, value: c.close })))
    } else if (chartType === 'bar') {
      mainSeries = chart.addSeries(BarSeries, {
        upColor: '#26a69a', downColor: '#ef5350', thinBars: false,
        priceLineVisible: false, lastValueVisible: true,
      })
      mainSeries.setData(chartData)
    } else {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a', downColor: '#ef5350',
        borderUpColor: '#26a69a', borderDownColor: '#ef5350',
        wickUpColor: '#26a69a', wickDownColor: '#ef5350',
        priceLineVisible: false, lastValueVisible: true,
      })
      mainSeries.setData(chartData)
    }

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      lastValueVisible: false,
      priceLineVisible: false,
    })
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      visible: false,
    })
    const volData = chartData
      .filter(c => c.volume != null && c.volume > 0)
      .map(c => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
      }))
    if (volData.length > 0) volumeSeries.setData(volData)

    const IST = 19800
    const isLong = (trade?.direction || 'LONG').toUpperCase() === 'LONG'
    const isWin  = (trade?.pnl || 0) >= 0
    const marks  = []
    if (trade?.date && trade?.entry_time) {
      try {
        const tRaw = String(trade.entry_time).trim()
        const tStr = tRaw.length === 5 ? tRaw + ':00' : tRaw.substring(0, 8)
        const eDT  = new Date(trade.date + 'T' + tStr + '+05:30')
        if (!isNaN(eDT.getTime())) {
          const eTs = Math.round(eDT.getTime() / 1000) + IST
          const eC  = chartData.reduce((b, c) => Math.abs(c.time - eTs) < Math.abs(b.time - eTs) ? c : b, chartData[0])
          marks.push({ time: eC.time, position: isLong ? 'belowBar' : 'aboveBar', color: '#2196f3', shape: isLong ? 'arrowUp' : 'arrowDown', text: 'E', size: 1 })
          if (trade.holding_time_mins && Number(trade.holding_time_mins) > 0) {
            const xTs = eTs + Number(trade.holding_time_mins) * 60
            const xC  = chartData.reduce((b, c) => Math.abs(c.time - xTs) < Math.abs(b.time - xTs) ? c : b, chartData[0])
            marks.push({ time: xC.time, position: isLong ? 'aboveBar' : 'belowBar', color: isWin ? '#26a69a' : '#ef5350', shape: isLong ? 'arrowDown' : 'arrowUp', text: 'X', size: 1 })
          }
          marks.sort((a, b) => a.time - b.time)
          markersRef.current = createSeriesMarkers(mainSeries, marks)
        }
      } catch (e) { console.warn('Marker error:', e.message) }
    }

    if (chartFrom && chartTo) {
      chart.timeScale().setVisibleRange({ from: chartFrom + IST, to: chartTo + IST })
    }

    const lastCandle = (p) => {
      if (!p || !p.time || !p.seriesData) return
      const d = p.seriesData.get(mainSeries)
      const v = p.seriesData.get(volumeSeries)
      if (d && d.open != null) {
        const isUp = Number(d.close) >= Number(d.open)
        setOhlcLegend({
          open: Number(d.open).toFixed(2), high: Number(d.high).toFixed(2),
          low:  Number(d.low).toFixed(2),  close: Number(d.close).toFixed(2),
          change:    (Number(d.close) - Number(d.open)).toFixed(2),
          changePct: ((Number(d.close) - Number(d.open)) / Number(d.open) * 100).toFixed(2),
          isUp, volume: v ? v.value : 0,
        })
      }
    }

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time) {
        const last = chartData[chartData.length - 1]
        if (last) {
          const isUp = Number(last.close) >= Number(last.open)
          setOhlcLegend({
            open: Number(last.open).toFixed(2), high: Number(last.high).toFixed(2),
            low:  Number(last.low).toFixed(2),  close: Number(last.close).toFixed(2),
            change:    (Number(last.close) - Number(last.open)).toFixed(2),
            changePct: ((Number(last.close) - Number(last.open)) / Number(last.open) * 100).toFixed(2),
            isUp, volume: last.volume || 0,
          })
        }
        return
      }
      lastCandle(param)
    })

    lwChartRef.current = chart
    lwSeriesRef.current = mainSeries
    lwVolumeRef.current = volumeSeries

    const ro = new ResizeObserver(() => {
      if (indianChartContainerRef.current && lwChartRef.current) {
        lwChartRef.current.applyOptions({
          width:  indianChartContainerRef.current.clientWidth,
          height: indianChartContainerRef.current.clientHeight || 400,
        })
      }
    })
    ro.observe(indianChartContainerRef.current)

    return () => {
      ro.disconnect()
      markersRef.current = null
      chart.remove()
      lwChartRef.current = null
      lwSeriesRef.current = null
      lwVolumeRef.current = null
    }
  }, [chartData, userTheme, isIndianMarket, isMaximized, chartFrom, chartTo, trade, chartType])

  useEffect(() => {
    if (!lwChartRef.current) return
    const chartIsDark = isMaximized || ['charcoal','navy','midnight'].includes(userTheme)
    lwChartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: chartIsDark ? '#131722' : '#ffffff' },
        textColor: chartIsDark ? '#b2b5be' : '#787b86',
      },
      grid: {
        vertLines: { color: chartIsDark ? 'rgba(42,46,57,0.5)' : 'rgba(42,46,57,0.06)' },
        horzLines: { color: chartIsDark ? 'rgba(42,46,57,0.5)' : 'rgba(42,46,57,0.06)' },
      },
    })
  }, [isMaximized, userTheme])

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
                  if (isIndianMarket && lwChartRef.current && chartFrom && chartTo) {
                    lwChartRef.current.timeScale().setVisibleRange({
                      from: chartFrom + 19800,
                      to: chartTo + 19800,
                    });
                  } else {
                    if (!iframeRef.current || !chartFrom || !chartTo) return;
                    const newUrl = buildTVWidgetURL(tvSymbol, interval, tvTheme, chartFrom, chartTo);
                    iframeRef.current.src = newUrl;
                  }
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
            ) : chartData ? ((() => {
              const chartIsDark = isMaximized || ['charcoal','navy','midnight'].includes(userTheme)
              const BG     = chartIsDark ? '#131722' : '#ffffff'
              const BORDER = chartIsDark ? '#2a2e39' : '#e0e3eb'
              const TEXT   = chartIsDark ? '#b2b5be' : '#787b86'
              const MUTED  = chartIsDark ? '#787b86' : '#9598a1'
              const symbolName = tvSymbol.includes(':') ? tvSymbol.split(':')[1] : tvSymbol
              const displayInterval = interval === 'D' ? '1D' : interval + 'M'
              const candleColor = ohlcLegend?.isUp ? '#26a69a' : '#ef5350'
              const changeSign = ohlcLegend && Number(ohlcLegend.change) >= 0 ? '+' : ''
              const formatVol = (v) => {
                if (!v || v <= 0) return ''
                if (v >= 1e9) return (v/1e9).toFixed(2) + 'B'
                if (v >= 1e6) return (v/1e6).toFixed(2) + 'M'
                if (v >= 1e3) return (v/1e3).toFixed(1) + 'K'
                return String(Math.round(v))
              }
              const toolBtnStyle = {
                background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 3,
                padding: '3px 5px', fontSize: 12, color: TEXT, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }
              const activeToolBtnStyle = { ...toolBtnStyle, background: chartIsDark ? '#2a2e39' : '#e8ecf0', color: chartIsDark ? '#d1d4dc' : '#131722' }
              const FONT = "-apple-system,BlinkMacSystemFont,'Trebuchet MS',Roboto,Ubuntu,sans-serif"

              return (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: 0, background: BG, overflow: 'hidden' }}>
                  {dataLimitedToDaily && (
                    <div style={{ background: 'rgba(245,158,11,0.12)', padding: '3px 8px', fontSize: 10, textAlign: 'center', color: '#92400e', flexShrink: 0 }}>
                      Showing daily candles — intraday not available for trades older than 60 days
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', height: 28, borderBottom: '0.5px solid ' + BORDER, padding: '0 6px', gap: 2, flexShrink: 0, background: BG }}>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button
                        type="button"
                        onClick={() => setChartType('candle')}
                        style={chartType === 'candle' ? activeToolBtnStyle : toolBtnStyle}
                        title="Candlestick"
                      >
                        <span style={{ fontSize: 13, fontWeight: 'bold' }}>‖</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartType('bar')}
                        style={chartType === 'bar' ? activeToolBtnStyle : toolBtnStyle}
                        title="Bar chart"
                      >
                        <span style={{ fontSize: 13, fontWeight: 'bold' }}>|</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartType('line')}
                        style={chartType === 'line' ? activeToolBtnStyle : toolBtnStyle}
                        title="Line chart"
                      >
                        <span style={{ fontSize: 12, fontWeight: 'bold' }}>/</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartType('area')}
                        style={chartType === 'area' ? activeToolBtnStyle : toolBtnStyle}
                        title="Area chart"
                      >
                        <span style={{ fontSize: 11, fontWeight: 'bold' }}>▲</span>
                      </button>
                    </div>

                    <div style={{ width: 1, height: 14, background: BORDER, margin: '0 4px' }} />

                    <button
                      type="button"
                      style={{ ...toolBtnStyle, cursor: 'default' }}
                      title="Indicators (coming soon)"
                    >
                      <span style={{ fontSize: 11 }}>Indicators</span>
                    </button>

                    <div style={{ flex: 1 }} />

                    <button
                      type="button"
                      onClick={handleScreenshot}
                      style={toolBtnStyle}
                      title="Download chart as PNG"
                    >
                      <span style={{ fontSize: 13 }}>📷</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                    <div style={{ width: 44, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0', gap: 1, borderRight: '0.5px solid ' + BORDER, background: BG, overflowY: 'hidden' }}>
                      {DRAWING_TOOLS.map((tool) => (
                        <button
                          key={tool.id}
                          type="button"
                          title={tool.label}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, color: TEXT, fontSize: tool.id === 'text' ? 13 : 14, fontWeight: tool.id === 'text' ? 700 : 400 }}
                        >
                          {tool.icon}
                        </button>
                      ))}
                      <div style={{ height: 0.5, background: BORDER, margin: '4px 6px', width: '28px' }} />
                    </div>

                    <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                      {ohlcLegend && (
                        <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 5, pointerEvents: 'none', fontFamily: FONT }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: chartIsDark ? '#d1d4dc' : '#131722', lineHeight: 1.4, marginBottom: 1 }}>
                            {symbolName + "  ·  " + displayInterval}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, lineHeight: 1.4, flexWrap: 'nowrap' }}>
                            <span>
                              <span style={{ color: MUTED, fontWeight: 400 }}>O</span>{' '}
                              <span style={{ color: candleColor, fontWeight: 400 }}>{ohlcLegend.open}</span>
                            </span>
                            <span>
                              <span style={{ color: MUTED, fontWeight: 400 }}>H</span>{' '}
                              <span style={{ color: candleColor, fontWeight: 400 }}>{ohlcLegend.high}</span>
                            </span>
                            <span>
                              <span style={{ color: MUTED, fontWeight: 400 }}>L</span>{' '}
                              <span style={{ color: candleColor, fontWeight: 400 }}>{ohlcLegend.low}</span>
                            </span>
                            <span>
                              <span style={{ color: MUTED, fontWeight: 400 }}>C</span>{' '}
                              <span style={{ color: candleColor, fontWeight: 400 }}>{ohlcLegend.close}</span>
                            </span>
                            <span style={{ color: candleColor, fontWeight: 400 }}>
                              {' ' + changeSign + ohlcLegend.change + " (" + changeSign + ohlcLegend.changePct + "%)"}
                            </span>
                          </div>

                          {formatVol(ohlcLegend.volume) !== '' && (
                            <div style={{ fontSize: 11, lineHeight: 1.4, marginTop: 1 }}>
                              <span style={{ color: MUTED }}>Vol · </span>
                              <span style={{ color: chartIsDark ? '#d1d4dc' : '#131722' }}>{formatVol(ohlcLegend.volume)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        ref={indianChartContainerRef}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()
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
