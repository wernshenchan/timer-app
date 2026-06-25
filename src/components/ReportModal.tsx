import { useTimeStore } from '@/store/timeStore';
import { formatTime } from '@/hooks/useTimerDisplay';
import { X, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface Props {
  onClose: () => void;
}

export default function ReportModal({ onClose }: Props) {
  const projects = useTimeStore((s) => s.projects);
  const timeEntries = useTimeStore((s) => s.timeEntries);
  const [copied, setCopied] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Build report data
  const reportData = projects
    .map((p) => {
      const entries = timeEntries.filter((e) => e.projectId === p.id).sort((a, b) => b.endTime - a.endTime);
      const totalSec = entries.reduce((sum, e) => sum + e.durationSeconds, 0);
      const runningSec = p.isRunning && p.sessionStartAt
        ? Math.floor((Date.now() - p.sessionStartAt) / 1000)
        : 0;
      const grandTotal = totalSec + runningSec;
      const uniqueDays = new Set(entries.map((e) => e.date)).size;
      const lastEntry = entries[0];

      return { project: p, entries, totalSec: grandTotal, uniqueDays, lastEntry };
    })
    .filter((d) => d.totalSec > 0)
    .sort((a, b) => b.totalSec - a.totalSec);

  const overallTotal = reportData.reduce((sum, d) => sum + d.totalSec, 0);
  const totalSessions = timeEntries.length;
  const totalDays = new Set(timeEntries.map((e) => e.date)).size;

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const generateReportText = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let text = `TIME TRACKING REPORT\n`;
    text += `Generated: ${dateStr} at ${timeStr}\n`;
    text += `${'─'.repeat(50)}\n\n`;
    text += `OVERVIEW\n`;
    text += `  Total time tracked:  ${formatTime(overallTotal)}\n`;
    text += `  Total sessions:      ${totalSessions}\n`;
    text += `  Days with activity:  ${totalDays}\n`;
    text += `  Projects tracked:    ${reportData.length}\n\n`;

    if (reportData.length > 0) {
      text += `BREAKDOWN BY PROJECT\n`;
      text += `${'─'.repeat(50)}\n`;
      for (const d of reportData) {
        text += `\n  ${d.project.name}\n`;
        text += `    Time:     ${formatTime(d.totalSec)}\n`;
        text += `    Sessions: ${d.entries.length}\n`;
        text += `    Days:     ${d.uniqueDays}\n`;
        if (d.lastEntry) {
          text += `    Last:     ${formatTimestamp(d.lastEntry.endTime).split(' ')[0]}\n`;
        }

        // List sessions with notes
        const entriesWithNotes = d.entries.filter((e) => e.note);
        if (entriesWithNotes.length > 0) {
          text += `    Notes:\n`;
          for (const e of entriesWithNotes) {
            const datePart = formatTimestamp(e.startTime).split(' ')[0];
            const startTimePart = formatTimestamp(e.startTime).split(' ')[1];
            text += `      ${datePart} ${startTimePart} (${formatTime(e.durationSeconds)}): ${e.note}\n`;
          }
        }
      }
    }

    return text;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateReportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-zinc-100 font-semibold text-sm">Time Report</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-1.5 px-3 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="timer-font text-xl font-bold text-amber-400 tabular-nums">{formatTime(overallTotal)}</div>
            <div className="text-zinc-500 text-xs mt-0.5">Total Time</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-zinc-200">{totalSessions}</div>
            <div className="text-zinc-500 text-xs mt-0.5">Sessions</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-zinc-200">{reportData.length}</div>
            <div className="text-zinc-500 text-xs mt-0.5">Projects</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-zinc-200">{totalDays}</div>
            <div className="text-zinc-500 text-xs mt-0.5">Active Days</div>
          </div>
        </div>

        {/* Per-project breakdown */}
        {reportData.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-4">No time tracked yet.</p>
        ) : (
          <div>
            <h4 className="text-xs font-medium text-zinc-500 mb-2">Per Project</h4>
            <div className="space-y-2">
              {reportData.map((d) => (
                <div key={d.project.id}>
                  <button
                    onClick={() => setExpandedProject(expandedProject === d.project.id ? null : d.project.id)}
                    className="w-full bg-zinc-800/30 rounded-lg p-3 text-left hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {expandedProject === d.project.id
                          ? <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
                          : <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
                        }
                        <span className="text-zinc-200 text-sm font-medium truncate">{d.project.name}</span>
                      </div>
                      <span className="timer-font text-sm text-amber-400 font-medium tabular-nums shrink-0 ml-2">
                        {formatTime(d.totalSec)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1 ml-4">
                      <span>{d.entries.length} session{d.entries.length !== 1 ? 's' : ''}</span>
                      <span>{d.uniqueDays} day{d.uniqueDays !== 1 ? 's' : ''}</span>
                      {d.lastEntry && (
                        <span>Last: {formatTimestamp(d.lastEntry.endTime).split(' ')[0]}</span>
                      )}
                    </div>
                  </button>

                  {/* Expanded session list with notes */}
                  {expandedProject === d.project.id && (
                    <div className="ml-5 mt-1 space-y-1">
                      {d.entries.map((entry) => (
                        <div key={entry.id} className="py-1.5 px-2 rounded-md bg-zinc-800/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">
                              {formatTimestamp(entry.startTime)} - {formatTimestamp(entry.endTime).split(' ')[1]}
                            </span>
                            <span className="timer-font text-xs text-zinc-400 tabular-nums">
                              {formatTime(entry.durationSeconds)}
                            </span>
                          </div>
                          {entry.note && (
                            <p className="text-xs text-amber-400/80 mt-0.5">{entry.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
