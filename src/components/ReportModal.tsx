import { useTimeStore } from '@/store/timeStore';
import { formatTime, formatTimeDecimal } from '@/hooks/useTimerDisplay';
import { useSettings } from '@/hooks/useSettings';
import { X, Copy, Check, ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';

interface Props {
  onClose: () => void;
}

export default function ReportModal({ onClose }: Props) {
  const projects = useTimeStore((s) => s.projects);
  const timeEntries = useTimeStore((s) => s.timeEntries);
  const { decimalHours } = useSettings();
  const [copied, setCopied] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fmt = (secs: number) => decimalHours ? formatTimeDecimal(secs) : formatTime(secs);

  // Filter entries by project + date range
  const filteredEntries = timeEntries.filter((e) => {
    if (filterProjectId && e.projectId !== filterProjectId) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    return true;
  });

  // Build report data
  const reportData = projects
    .map((p) => {
      if (filterProjectId && p.id !== filterProjectId) return null;
      const entries = filteredEntries.filter((e) => e.projectId === p.id).sort((a, b) => b.endTime - a.endTime);
      const totalSec = entries.reduce((sum, e) => sum + e.durationSeconds, 0);
      const runningSec = (p.isRunning || p.isPaused) && p.sessionStartAt
        ? Math.floor((Date.now() - p.sessionStartAt) / 1000)
        : 0;
      const grandTotal = totalSec + runningSec;
      const uniqueDays = new Set(entries.map((e) => e.date)).size;
      const lastEntry = entries[0];

      return { project: p, entries, totalSec: grandTotal, uniqueDays, lastEntry };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null && d.totalSec > 0)
    .sort((a, b) => b.totalSec - a.totalSec);

  const overallTotal = reportData.reduce((sum, d) => sum + d.totalSec, 0);
  const totalSessions = filteredEntries.length;
  const totalDays = new Set(filteredEntries.map((e) => e.date)).size;

  const filterLabel = filterProjectId
    ? projects.find((p) => p.id === filterProjectId)?.name || 'Unknown'
    : 'All Projects';

  const hasDateFilter = dateFrom || dateTo;

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const generateReportText = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let text = `TIME TRACKING REPORT\n`;
    text += `Project: ${filterLabel}\n`;
    if (hasDateFilter) {
      text += `Date range: ${dateFrom || 'start'} → ${dateTo || 'end'}\n`;
    }
    text += `Generated: ${dateStr} at ${timeStr}\n`;
    text += `${'─'.repeat(50)}\n\n`;
    text += `OVERVIEW\n`;
    text += `  Total time tracked:  ${fmt(overallTotal)}\n`;
    text += `  Total sessions:      ${totalSessions}\n`;
    text += `  Days with activity:  ${totalDays}\n`;
    if (!filterProjectId) {
      text += `  Projects tracked:    ${reportData.length}\n`;
    }
    text += `\n`;

    if (reportData.length > 0) {
      text += `BREAKDOWN BY PROJECT\n`;
      text += `${'─'.repeat(50)}\n`;
      for (const d of reportData) {
        text += `\n  ${d.project.name}\n`;
        text += `    Time:     ${fmt(d.totalSec)}\n`;
        text += `    Sessions: ${d.entries.length}\n`;
        text += `    Days:     ${d.uniqueDays}\n`;
        if (d.lastEntry) {
          text += `    Last:     ${formatTimestamp(d.lastEntry.endTime).split(' ')[0]}\n`;
        }

        const entriesWithNotes = d.entries.filter((e) => e.note);
        if (entriesWithNotes.length > 0) {
          text += `    Notes:\n`;
          for (const e of entriesWithNotes) {
            const datePart = formatTimestamp(e.startTime).split(' ')[0];
            const startTimePart = formatTimestamp(e.startTime).split(' ')[1];
            text += `      ${datePart} ${startTimePart} (${fmt(e.durationSeconds)}): ${e.note}\n`;
          }
        }

        if (filterProjectId && d.entries.length > 0) {
          text += `    Sessions:\n`;
          for (const e of d.entries) {
            const datePart = formatTimestamp(e.startTime).split(' ')[0];
            const startTimePart = formatTimestamp(e.startTime).split(' ')[1];
            const endTimePart = formatTimestamp(e.endTime).split(' ')[1];
            text += `      ${datePart} ${startTimePart} - ${endTimePart} (${fmt(e.durationSeconds)})`;
            if (e.note) text += `: ${e.note}`;
            text += `\n`;
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

  const handleCSV = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const safeName = filterLabel.replace(/[^a-zA-Z0-9]/g, '_');

    const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;

    const rows: string[][] = [];
    rows.push([csvEscape(`Time Tracking Report — ${filterLabel}`)]);
    if (hasDateFilter) rows.push([csvEscape(`Date range: ${dateFrom || 'start'} → ${dateTo || 'end'}`)]);
    rows.push([csvEscape(`Generated: ${dateStr}`)]);
    rows.push([]);
    rows.push(['Overview']);
    rows.push(['Total Time', fmt(overallTotal)]);
    rows.push(['Total Sessions', String(totalSessions)]);
    rows.push(['Active Days', String(totalDays)]);
    if (!filterProjectId) rows.push(['Projects Tracked', String(reportData.length)]);
    rows.push([]);
    rows.push(['Project', 'Date', 'Start', 'End', 'Duration', 'Note']);

    for (const d of reportData) {
      for (const e of d.entries) {
        const start = new Date(e.startTime);
        const end = new Date(e.endTime);
        const dateCol = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const startCol = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
        const endCol = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
        rows.push([
          csvEscape(d.project.name),
          dateCol,
          startCol,
          endCol,
          fmt(e.durationSeconds),
          csvEscape(e.note || ''),
        ]);
      }
    }

    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${safeName}-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
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
            <button
              onClick={handleCSV}
              className="flex items-center gap-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg py-1.5 px-3 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              CSV
            </button>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Project + Date filters */}
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { setFilterProjectId(null); setExpandedProject(null); }}
              className={`text-xs rounded-lg py-1.5 px-3 transition-colors ${
                filterProjectId === null
                  ? 'bg-amber-600/20 text-amber-400'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Projects
            </button>
            {projects
              .filter((p) => timeEntries.some((e) => e.projectId === p.id))
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setFilterProjectId(p.id); setExpandedProject(p.id); }}
                  className={`text-xs rounded-lg py-1.5 px-3 transition-colors truncate max-w-[160px] ${
                    filterProjectId === p.id
                      ? 'bg-amber-600/20 text-amber-400'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-600/50"
              placeholder="From"
            />
            <span className="text-zinc-600 text-xs">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-600/50"
              placeholder="To"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg py-1.5 px-2 transition-colors"
              >
                X
              </button>
            )}
          </div>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className={`font-bold text-amber-400 tabular-nums ${decimalHours ? 'text-lg' : 'timer-font text-xl'}`}>{fmt(overallTotal)}</div>
            <div className="text-zinc-500 text-xs mt-0.5">Total Time</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-zinc-200">{totalSessions}</div>
            <div className="text-zinc-500 text-xs mt-0.5">Sessions</div>
          </div>
          {filterProjectId ? (
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center col-span-2">
              <div className="text-xl font-bold text-zinc-200">{totalDays}</div>
              <div className="text-zinc-500 text-xs mt-0.5">Active Days</div>
            </div>
          ) : (
            <>
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-zinc-200">{reportData.length}</div>
                <div className="text-zinc-500 text-xs mt-0.5">Projects</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-zinc-200">{totalDays}</div>
                <div className="text-zinc-500 text-xs mt-0.5">Active Days</div>
              </div>
            </>
          )}
        </div>

        {/* Per-project breakdown */}
        {reportData.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-4">No sessions match your filters.</p>
        ) : (
          <div>
            <h4 className="text-xs font-medium text-zinc-500 mb-2">
              {filterProjectId ? 'Sessions' : 'Per Project'}
            </h4>
            <div className="space-y-2">
              {reportData.map((d) => (
                <div key={d.project.id}>
                  <button
                    onClick={() => setExpandedProject(expandedProject === d.project.id ? null : d.project.id)}
                    className="w-full bg-zinc-800/30 rounded-lg p-3 text-left hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!filterProjectId && (
                          expandedProject === d.project.id
                            ? <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
                            : <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
                        )}
                        <span
                          className="text-zinc-200 text-sm font-medium truncate"
                        >
                          {d.project.name}
                        </span>
                      </div>
                      <span className={`font-medium tabular-nums text-amber-400 shrink-0 ml-2 ${decimalHours ? 'text-sm' : 'timer-font text-sm'}`}>
                        {fmt(d.totalSec)}
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

                  {(expandedProject === d.project.id || filterProjectId) && (
                    <div className="ml-5 mt-1 space-y-1">
                      {d.entries.map((entry) => (
                        <div key={entry.id} className="py-1.5 px-2 rounded-md bg-zinc-800/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">
                              {formatTimestamp(entry.startTime)} - {formatTimestamp(entry.endTime).split(' ')[1]}
                            </span>
                            <span className={`text-xs text-zinc-400 tabular-nums ${decimalHours ? '' : 'timer-font'}`}>
                              {fmt(entry.durationSeconds)}
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
