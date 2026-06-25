import { useState } from 'react';
import { useTimeStore } from '@/store/timeStore';
import { formatTime } from '@/hooks/useTimerDisplay';
import { X } from 'lucide-react';
import type { TimeEntry } from '@/types';

interface Props {
  entry: TimeEntry;
  projectName: string;
  onClose: () => void;
}

export default function SessionEditModal({ entry, projectName, onClose }: Props) {
  const editTimeEntry = useTimeStore((s) => s.editTimeEntry);
  const setEntryNote = useTimeStore((s) => s.setEntryNote);
  const deleteTimeEntry = useTimeStore((s) => s.deleteTimeEntry);

  const startDate = new Date(entry.startTime);
  const endDate = new Date(entry.endTime);

  const [startDt, setStartDt] = useState(
    `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
  );
  const [startTm, setStartTm] = useState(
    `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
  );
  const [endDt, setEndDt] = useState(
    `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
  );
  const [endTm, setEndTm] = useState(
    `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
  );
  const [note, setNote] = useState(entry.note || '');

  const newStart = new Date(`${startDt}T${startTm}:00`).getTime();
  const newEnd = new Date(`${endDt}T${endTm}:00`).getTime();
  const newDuration = Math.max(0, Math.floor((newEnd - newStart) / 1000));

  const handleSave = () => {
    if (isNaN(newStart) || isNaN(newEnd)) return;
    if (newStart >= newEnd) return;
    editTimeEntry(entry.id, newStart, newEnd);
    setEntryNote(entry.id, note);
    onClose();
  };

  const handleDelete = () => {
    deleteTimeEntry(entry.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-zinc-100 font-semibold text-sm">Edit Session</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-zinc-400 text-xs mb-4">
          Edit session for <span className="text-amber-400">{projectName}</span>
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-zinc-500 text-xs mb-1 block">Start</label>
            <div className="flex gap-2">
              <input type="date" value={startDt} onChange={(e) => setStartDt(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50" />
              <input type="time" value={startTm} onChange={(e) => setStartTm(e.target.value)}
                className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50" />
            </div>
          </div>
          <div>
            <label className="text-zinc-500 text-xs mb-1 block">End</label>
            <div className="flex gap-2">
              <input type="date" value={endDt} onChange={(e) => setEndDt(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50" />
              <input type="time" value={endTm} onChange={(e) => setEndTm(e.target.value)}
                className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50" />
            </div>
          </div>

          <div className="flex items-center justify-center py-2 bg-zinc-800/50 rounded-lg">
            <span className="text-zinc-500 text-xs mr-2">Duration:</span>
            <span className="timer-font text-amber-400 font-medium tabular-nums text-sm">
              {formatTime(newDuration)}
            </span>
          </div>

          <div>
            <label className="text-zinc-500 text-xs mb-1 block">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you work on? e.g. task A, bug fix..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
              maxLength={200}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleDelete}
              className="bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg py-2 px-3 text-sm transition-colors"
            >
              Delete
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isNaN(newStart) || isNaN(newEnd) || newStart >= newEnd}
              className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-medium rounded-lg py-2 text-sm transition-colors disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
