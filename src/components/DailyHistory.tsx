import { useTimeStore } from '@/store/timeStore';
import { formatTime } from '@/hooks/useTimerDisplay';
import { History } from 'lucide-react';

export default function DailyHistory() {
  const projects = useTimeStore((s) => s.projects);
  const timeEntries = useTimeStore((s) => s.timeEntries);

  // Get today's entries grouped by project
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const todayEntries = timeEntries.filter((e) => e.date === todayStr);

  if (todayEntries.length === 0 && !projects.some((p) => p.isRunning)) {
    return null;
  }

  const grouped: Record<string, { name: string; total: number; count: number }> = {};
  for (const entry of todayEntries) {
    const project = projects.find((p) => p.id === entry.projectId);
    const name = project?.name || 'Unknown';
    if (!grouped[entry.projectId]) {
      grouped[entry.projectId] = { name, total: 0, count: 0 };
    }
    grouped[entry.projectId].total += entry.durationSeconds;
    grouped[entry.projectId].count++;
  }

  // Add running project(s) to the list
  for (const p of projects) {
    if (p.isRunning && p.sessionStartAt) {
      const running = Math.floor((Date.now() - p.sessionStartAt) / 1000);
      if (!grouped[p.id]) {
        grouped[p.id] = { name: p.name, total: 0, count: 0 };
      }
      grouped[p.id].total += running;
    }
  }

  return (
    <div className="border-t border-zinc-800 pt-4 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-zinc-500" />
        <h2 className="text-sm font-medium text-zinc-500">Today's History</h2>
      </div>
      <div className="space-y-1.5">
        {Object.entries(grouped).map(([projectId, data]) => (
          <div key={projectId} className="flex items-center justify-between py-1.5 px-3 bg-zinc-900/30 rounded-lg">
            <span className="text-zinc-300 text-sm">{data.name}</span>
            <div className="flex items-center gap-2">
              {data.count > 0 && !projects.find(p => p.id === projectId)?.isRunning && (
                <span className="text-zinc-600 text-xs">{data.count} session{data.count > 1 ? 's' : ''}</span>
              )}
              <span className={`timer-font text-sm font-medium tabular-nums ${projects.find(p => p.id === projectId)?.isRunning ? 'text-amber-400' : 'text-zinc-400'}`}>
                {formatTime(data.total)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
