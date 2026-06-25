import { useEffect, useState } from 'react';
import { useTimeStore } from '@/store/timeStore';
import { formatTime } from '@/hooks/useTimerDisplay';
import { Clock } from 'lucide-react';

export default function Header() {
  const getTotalTodaySeconds = useTimeStore((s) => s.getTotalTodaySeconds);
  const [totalToday, setTotalToday] = useState('00:00:00');

  useEffect(() => {
    const update = () => setTotalToday(formatTime(getTotalTodaySeconds()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [getTotalTodaySeconds]);

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-amber-500" />
          <h1 className="text-lg font-semibold text-zinc-100">Time Tracker</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500">Today:</span>
          <span className="timer-font text-amber-400 font-medium tabular-nums">{totalToday}</span>
        </div>
      </div>
    </header>
  );
}
