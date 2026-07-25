import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { formatINR } from '../lib/calculations';

export interface CalendarDay {
  day: number;
  month: string;
  year: number;
  isCurrentMonth: boolean;
  dateStr: string;
}

export interface MiniCalendarWidgetProps {
  selectedMonth: string;
  selectedYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onPrevYear: () => void;
  onNextYear: () => void;
  calendarDays: CalendarDay[];
  groupedTrades: Record<string, any[]>;
  todayStr: string;
  highlightedDay?: string | null;
  onDayClick: (dayObj: CalendarDay) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const MiniCalendarWidget: React.FC<MiniCalendarWidgetProps> = ({
  selectedMonth,
  selectedYear,
  onPrevMonth,
  onNextMonth,
  onPrevYear,
  onNextYear,
  calendarDays,
  groupedTrades,
  todayStr,
  highlightedDay,
  onDayClick,
  className = '',
  style = {}
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        ...style
      }}
      className={`p-4 select-none ${className}`}
    >
      {/* CALENDAR HEADER */}
      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onPrevYear}
            className="p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
            style={{ color: 'var(--text-sub)' }}
            title="Previous Year"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
            style={{ color: 'var(--text-sub)' }}
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <span className="text-sm font-bold font-display px-2 text-center" style={{ color: 'var(--text)' }}>
          {selectedMonth} {selectedYear}
        </span>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onNextMonth}
            className="p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
            style={{ color: 'var(--text-sub)' }}
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNextYear}
            className="p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
            style={{ color: 'var(--text-sub)' }}
            title="Next Year"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* WEEKDAYS HEADER ROW */}
      <div className="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* CALENDAR CELLS GRID */}
      <div className="grid grid-cols-7 gap-1 mt-1 text-center text-xs">
        {calendarDays.map((dayObj, index) => {
          const tradesOnDay = groupedTrades[dayObj.dateStr] || [];
          const hasTrades = tradesOnDay.length > 0;
          const isToday = dayObj.dateStr === todayStr;
          const isSelected = dayObj.dateStr === highlightedDay;

          // Calculate Net P&L for highlighting
          const daySumPnl = tradesOnDay.reduce((sum, t: any) => sum + (t.pnl || 0), 0);
          const daySumFees = tradesOnDay.reduce((sum, t: any) => sum + (t.fees || 0), 0);
          const dailyNet = daySumPnl - daySumFees;

          const isProfitable = dailyNet > 0;
          const isLoss = dailyNet < 0;

          // Conditional styles
          let cellStyle: React.CSSProperties = {
            aspectRatio: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0px',
            cursor: 'pointer',
            position: 'relative',
            border: isSelected
              ? '2px solid var(--accent)'
              : isToday
              ? '1.5px dashed var(--accent)'
              : '1px solid transparent',
            boxShadow: isSelected ? '0 0 10px rgba(99, 102, 241, 0.25)' : 'none',
          };

          if (hasTrades) {
            cellStyle.backgroundColor = isProfitable
              ? 'rgba(0, 143, 103, 0.15)'
              : isLoss
              ? 'rgba(223, 28, 48, 0.15)'
              : 'rgba(255, 255, 255, 0.08)';
            cellStyle.color = isProfitable
              ? '#008F67'
              : isLoss
              ? '#DF1C30'
              : 'var(--text)';
            cellStyle.fontWeight = 'normal';
          } else {
            cellStyle.color = dayObj.isCurrentMonth ? 'var(--text)' : 'var(--text-muted)';
            cellStyle.opacity = dayObj.isCurrentMonth ? '1' : '0.4';
          }

          return (
            <div
              key={`${dayObj.dateStr}-${index}`}
              onClick={() => onDayClick(dayObj)}
              style={cellStyle}
              className={`transition-all hover:brightness-110`}
              title={hasTrades ? `${tradesOnDay.length} trades | Net P&L: ${formatINR(dailyNet)}` : ''}
            >
              <span style={{ fontSize: '12px' }}>{dayObj.day}</span>
              {/* Tiny dot to signify trades if style doesn't fully highlight */}
              {hasTrades && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '3px',
                    width: '3.5px',
                    height: '3.5px',
                    borderRadius: '999px',
                    backgroundColor: isProfitable ? '#008F67' : isLoss ? '#DF1C30' : '#a1a1aa',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
