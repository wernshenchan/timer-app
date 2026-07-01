import { useState } from 'react';
import { useTimeStore } from '@/store/timeStore';
import { formatTime, formatTimeDecimal } from '@/hooks/useTimerDisplay';
import { useSettings } from '@/hooks/useSettings';
import SessionEditModal from './SessionEditModal';
import { History, ChevronDown, ChevronRight, Pencil, Search, X } from 'lucide-react';
import type { TimeEntry } from '@/types';

export default function DailyHistory() {
  const projects = useTimeStore((s) => s.projects);
  const timeEntries = useTimeStore((s) => s.timeEntries);
  const { decimalHours } = useSettings();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const todayEntries = timeEntries.filter((e) => e.date === todayStr);
  const allEntries = [...timeEntries].sort((a, b) => b.endTime - a.endTime);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (todayEntries.length === 0 && timeEntries.length === 0 && !projects.some((p) => p.isRunning || p.isPaused)) {
    return null;
  }

  const fmt = (secs: number) => decimalHours ? formatTimeDecimal(secs) : formatTime(secs);

  // Filter sessions by note search
  const filteredAllEntries = searchQuery.trim()
    ? allEntries.filter((e) => (e.note || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : allEntries;
  const filteredTodayEntries = searchQuery.trim()
    ? todayEntries.filter((e) => (e.note || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : todayEntries;

  // Group today's entries by project
  const grouped: Record<string, { name: string; total: number; entries: TimeEntry[]; hasRunning: boolean }> = {};

  for (const entry of filteredTodayEntries) {
    const project = projects.find((p) => p.id === entry.projectId);
    const name = project?.name || 'Unknown';
    if (!grouped[entry.projectId]) {
      grouped[entry.projectId] = { name, total: 0, entries: [], hasRunning: false };
    }
    grouped[entry.projectId].total += entry.durationSeconds;
    grouped[entry.projectId].entries.push(entry);
  }

  for (const p of projects) {
    if ((p.isRunning || p.isPaused) && p.sessionStartAt) {
      const running = p.isPaused && p.pausedAt
        ? Math.floor((p.pausedAt - p.sessionStartAt) / 1000)
        : Math.floor((Date.now() - p.sessionStartAt) / 1000);
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

  const formatDateFull = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <>
      <div className="border-t border-zinc-800 pt-4 mt-4">
        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions by note..."
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-8 pr-8 py-1.5 text-zinc-100 text-xs placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-600/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Today's summary */}
        {Object.keys(grouped).length > 0 && !searchQuery.trim() && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-medium text-zinc-500">Today's History</h2>
            </div>

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
                        {data.hasRunning && ' · active'}
                      </span>
                      <span className={`font-medium tabular-nums text-amber-400 ${decimalHours ? 'text-sm' : 'timer-font text-sm'}`}>
                        {fmt(data.total)}
                      </span>
                    </div>
                  </button>

                  {expandedProject === projectId && data.entries.length > 0 && (
                    <div className="ml-5 mt-1 space-y-0.5">
                      {data.entries
                        .sort((a, b) => b.endTime - a.endTime)
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className="py-1 px-2 rounded-md hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                            onClick={() => setEditingEntry(entry)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <span>{formatSessionTime(entry.startTime)}</span>
                                <span className="text-zinc-700">-</span>
                                <span>{formatSessionTime(entry.endTime)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs text-zinc-400 tabular-nums ${decimalHours ? '' : 'timer-font'}`}>
                                  {fmt(entry.durationSeconds)}
                                </span>
                                <span className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-600 transition-all">
                                  <Pencil className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                            {entry.note && (
                              <p className="text-xs text-zinc-500 mt-0.5 ml-0 truncate">{entry.note}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* All Sessions */}
        {filteredAllEntries.length > 0 && (
          <div className={Object.keys(grouped).length > 0 && !searchQuery.trim() ? 'border-t border-zinc-800/50 pt-3 mt-3' : ''}>
            <h3 className="text-xs font-medium text-zinc-600 mb-2">
              {searchQuery.trim()
                ? `Matching Sessions (${filteredAllEntries.length})`
                : `All Sessions (${filteredAllEntries.length})`
              }
            </h3>
            <div className="space-y-0.5">
              {filteredAllEntries.map((entry) => {
                const project = projects.find((p) => p.id === entry.projectId);
                const isToday = entry.date === todayStr;
                return (
                  <div
                    key={entry.id}
                    className="py-1 px-2 rounded-md hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                    onClick={() => setEditingEntry(entry)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-zinc-300 text-xs truncate">
                          {project?.name || 'Unknown'}
                        </span>
                        <span className="text-zinc-600 text-xs shrink-0">
                          {isToday ? '' : `${formatDateFull(entry.startTime)} `}
                          {formatSessionTime(entry.startTime)} - {formatSessionTime(entry.endTime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs text-zinc-400 tabular-nums ${decimalHours ? '' : 'timer-font'}`}>
                          {fmt(entry.durationSeconds)}
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-600 transition-all">
                          <Pencil className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                    {entry.note && (
                      <p className="text-xs text-zinc-500 mt-0.5 ml-0 truncate">{entry.note}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {searchQuery.trim() && filteredAllEntries.length === 0 && filteredTodayEntries.length === 0 && (
          <p className="text-zinc-600 text-xs text-center py-4">No sessions match your search.</p>
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
