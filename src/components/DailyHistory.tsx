import { useState } from 'react';
import { useTimeStore } from '@/store/timeStore';
import { formatTime } from '@/hooks/useTimerDisplay';
import SessionEditModal from './SessionEditModal';
import { History, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import type { TimeEntry } from '@/types';

export default function DailyHistory() {
  const projects = useTimeStore((s) => s.projects);
  const timeEntries = useTimeStore((s) => s.timeEntries);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const todayEntries = timeEntries.filter((e) => e.date === todayStr);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  if (todayEntries.length === 0 && !projects.some((p) => p.isRunning)) {
    return null;
  }

  // Group by project
  const grouped: Record<string, { name: string; total: number; entries: TimeEntry[]; hasRunning: boolean }> = {};

  for (const entry of todayEntries) {
    const project = projects.find((p) => p.id === entry.projectId);
    const name = project?.name || 'Unknown';
    if (!grouped[entry.projectId]) {
      grouped[entry.projectId] = { name, total: 0, entries: [], hasRunning: false };
    }
    grouped[entry.projectId].total += entry.durationSeconds;
    grouped[entry.projectId].entries.push(entry);
  }

  // Add running projects
  for (const p of projects) {
    if (p.isRunning && p.sessionStartAt) {
      const running = Math.floor((Date.now() - p.sessionStartAt) / 1000);
      if (!grouped[p.id]) {
        grouped[p.id] = { name: p.name, total: 0, entries: [], hasRunning: true };
      }
      grouped[p.id].total += running;
      grouped[p.id].hasRunning = true;
    }
  }

  const formatSessionTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const entrySort = [...todayEntries].sort((a, b) => b.endTime - a.endTime);

  return (
    <>
      <div className="border-t border-zinc-800 pt-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-500">Today's History</h2>
        </div>

        {/* Grouped summary */}
        <div className="space-y-1 mb-3">
          {Object.entries(grouped).map(([projectId, data]) => (
            <div key={projectId}>
              <button
                onClick={() => setExpandedProject(expandedProject === projectId ? null : projectId)}
                className="w-full flex items-center justify-between py-1.5 px-3 bg-zinc-900/30 rounded-lg hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  {expandedProject === projectId
                    ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                    : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  }
                  <span className="text-zinc-300 text-sm">{data.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600 text-xs">
                    {data.entries.length} session{data.entries.length !== 1 ? 's' : ''}
                    {data.hasRunning && ' · running'}
                  </span>
                  <span className="timer-font text-sm font-medium tabular-nums text-amber-400">
                    {formatTime(data.total)}
                  </span>
                </div>
              </button>

              {/* Expandable session list */}
              {expandedProject === projectId && data.entries.length > 0 && (
                <div className="ml-5 mt-1 space-y-0.5">
                  {data.entries
                    .sort((a, b) => b.endTime - a.endTime)
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-zinc-800/30 transition-colors group"
                      >
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span>{formatSessionTime(entry.startTime)}</span>
                          <span className="text-zinc-700">-</span>
                          <span>{formatSessionTime(entry.endTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="timer-font text-xs text-zinc-400 tabular-nums">
                            {formatTime(entry.durationSeconds)}
                          </span>
                          <button
                            onClick={() => setEditingEntry(entry)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-600 hover:text-amber-400 transition-all"
                            title="Edit session"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Compact chronological list */}
        {entrySort.length > 0 && (
          <div className="border-t border-zinc-800/50 pt-3 mt-3">
            <h3 className="text-xs font-medium text-zinc-600 mb-2">All Sessions</h3>
            <div className="space-y-0.5">
              {entrySort.map((entry) => {
                const project = projects.find((p) => p.id === entry.projectId);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-zinc-800/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-zinc-300 text-xs truncate">
                        {project?.name || 'Unknown'}
                      </span>
                      <span className="text-zinc-600 text-xs shrink-0">
                        {formatSessionTime(entry.startTime)} - {formatSessionTime(entry.endTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="timer-font text-xs text-zinc-400 tabular-nums">
                        {formatTime(entry.durationSeconds)}
                      </span>
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-600 hover:text-amber-400 transition-all"
                        title="Edit session"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {editingEntry && (
        <SessionEditModal
          entry={editingEntry}
          projectName={projects.find((p) => p.id === editingEntry.projectId)?.name || 'Unknown'}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </>
  );
}
