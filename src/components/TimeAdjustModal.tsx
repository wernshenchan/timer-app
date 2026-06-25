import { useState } from 'react';
import { useTimeStore } from '@/store/timeStore';
import { X } from 'lucide-react';

interface Props {
  projectId: string;
  projectName: string;
  currentStartAt: number;
  onClose: () => void;
}

export default function TimeAdjustModal({ projectId, projectName, currentStartAt, onClose }: Props) {
  const adjustStartTime = useTimeStore((s) => s.adjustStartTime);
  const now = new Date();
  const currentDate = new Date(currentStartAt);

  const [date, setDate] = useState(
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
  );
  const [time, setTime] = useState(
    `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`
  );

  const handleSave = () => {
    const newStart = new Date(`${date}T${time}:00`).getTime();
    if (isNaN(newStart)) return;
    if (newStart > Date.now()) return;
    adjustStartTime(projectId, newStart);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-zinc-100 font-semibold text-sm">Adjust Start Time</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-zinc-400 text-xs mb-4">
          Set when <span className="text-amber-400">{projectName}</span> actually started:
        </p>
        <div className="space-y-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/50"
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-zinc-900 font-medium rounded-lg py-2 text-sm transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
