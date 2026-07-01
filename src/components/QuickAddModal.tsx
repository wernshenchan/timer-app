import { useState } from 'react';
import { useTimeStore } from '@/store/timeStore';
import { formatTime } from '@/hooks/useTimerDisplay';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function QuickAddModal({ onClose }: Props) {
  const projects = useTimeStore((s) => s.projects);
  const addTimeEntry = useTimeStore((s) => s.addTimeEntry);

  const now = new Date();
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const defaultStartTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes() - 1).padStart(2, '0')}`;
  const defaultEndTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [projectId, setProjectId] = useState(projects.filter((p) => !p.archived)[0]?.id || '');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const start = new Date(`${date}T${startTime}:00`).getTime();
    const end = new Date(`${date}T${endTime}:00`).getTime();
    if (isNaN(start) || isNaN(end) || start >= end) return;
    addTimeEntry(projectId, start, end, note);
    setSaved(true);
    setTimeout(() => onClose(), 1000);
  };

  const startMs = new Date(`${date}T${startTime}:00`).getTime();
  const endMs = new Date(`${date}T${endTime}:00`).getTime();
  const durationMs = Math.max(0, Math.floor((endMs - startMs) / 1000));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-zinc-100 font-semibold text-sm">Quick Add Session</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {saved ? (
          <p className="text-emerald-400 text-sm text-center py-8">Session saved!</p>
        ) : (
          <>
            {projects.filter((p) => !p.archived).length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-6">No projects available. Create one first.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-zinc-500 text-xs mb-1 block">Project</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                  >
                    {projects.filter((p) => !p.archived).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-zinc-500 text-xs mb-1 block">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-zinc-500 text-xs mb-1 block">Start</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-zinc-500 text-xs mb-1 block">End</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-500 text-xs mb-1 block">Note (optional)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What did you work on?"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                    maxLength={200}
                  />
                </div>

                <div className="flex items-center justify-center py-2 bg-zinc-800/50 rounded-lg">
                  <span className="text-zinc-500 text-xs mr-2">Duration:</span>
                  <span className="timer-font text-amber-400 font-medium tabular-nums text-sm">
                    {formatTime(durationMs)}
                  </span>
                </div>

                <button
                  onClick={handleSave}
                  disabled={!projectId || isNaN(startMs) || isNaN(endMs) || startMs >= endMs}
                  className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-medium rounded-lg py-2 text-sm transition-colors disabled:cursor-not-allowed"
                >
                  Save Session
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
