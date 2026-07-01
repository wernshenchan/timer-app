import { useEffect, useState } from 'react';
import { useTimeStore } from '@/store/timeStore';
import { formatTime, formatTimeDecimal } from '@/hooks/useTimerDisplay';
import { useSettings } from '@/hooks/useSettings';
import { Clock, BarChart3, Hash } from 'lucide-react';

interface Props {
  onReportClick: () => void;
}

export default function Header({ onReportClick }: Props) {
  const getTotalTodaySeconds = useTimeStore((s) => s.getTotalTodaySeconds);
  const { decimalHours, update } = useSettings();
  const [totalToday, setTotalToday] = useState('00:00:00');

  useEffect(() => {
    const updateDisplay = () => {
      const secs = getTotalTodaySeconds();
      setTotalToday(decimalHours ? formatTimeDecimal(secs) : formatTime(secs));
    };
    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [getTotalTodaySeconds, decimalHours]);

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-amber-500" />
          <h1 className="text-lg font-semibold text-zinc-100">Time Tracker</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => update({ decimalHours: !decimalHours })}
            className={`flex items-center gap-1 text-xs rounded-lg py-1.5 px-2.5 transition-colors ${
              decimalHours
                ? 'bg-amber-600/20 text-amber-400'
                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle decimal hours"
          >
            <Hash className="w-3 h-3" />
            0.00h
          </button>
          <button
            onClick={onReportClick}
            className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-1.5 px-3 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Report
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Today:</span>
            <span className={`font-medium tabular-nums text-amber-400 ${decimalHours ? 'text-sm' : 'timer-font'}`}>{totalToday}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
