import { useState } from 'react';
import { getTVSymbol, getTVTheme, buildTVWidgetURL } from '../lib/symbolMap';

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

      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          TRADE CHART
        </span>
        <div style={{ overflowX: 'auto', display: 'flex', gap: '4px' }}>
          {TIMEFRAMES.map((tf) => {
            const isActive = interval === tf.value;
            const btnStyle = isActive ? {
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

            return (
              <button
                key={tf.value}
                onClick={() => setActiveInterval(tf.value)}
                style={btnStyle}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TradingView Chart Frame or Indian Market Notice */}
      {isIndianMarket ? (
        <div style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          {/* ROW 1 — Notice bar at the top */}
          <div style={{ background: 'rgba(245,158,11,0.1)', borderBottom: '0.5px solid rgba(245,158,11,0.2)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--text-sub)', lineHeight: 1.5 }}>
              NSE/BSE charts require a TradingView account. The free embedded chart cannot display Indian market data without login.
            </span>
          </div>

          {/* ROW 2 — Action area */}
          <div style={{ padding: '20px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', minHeight: '180px', justifyContent: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '4px 12px', marginBottom: '4px' }}>
              {tvSymbol}
            </div>
            
            <div style={{ fontSize: '12px', color: 'var(--text-sub)', textAlign: 'center' }}>
              View this chart on TradingView website
            </div>

            <a
              href={tvWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent)', color: '#ffffff', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', border: 'none', cursor: 'pointer' }}
            >
              Open {tvSymbol} on TradingView ↗
            </a>

            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
              Opens in a new tab · Free TradingView account required for NSE data
            </div>
          </div>
        </div>
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
    </div>
  );
}
