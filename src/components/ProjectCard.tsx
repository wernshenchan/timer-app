import { useState } from 'react';
import { useTimeStore } from '@/store/timeStore';
import { useRunningTimer, formatTime, formatTimeShort } from '@/hooks/useTimerDisplay';
import TimeAdjustModal from './TimeAdjustModal';
import { Play, Square, Pause, Clock, Trash2 } from 'lucide-react';

interface Props {
  projectId: string;
}

export default function ProjectCard({ projectId }: Props) {
  const projects = useTimeStore((s) => s.projects);
  const startTimer = useTimeStore((s) => s.startTimer);
  const stopTimer = useTimeStore((s) => s.stopTimer);
  const pauseTimer = useTimeStore((s) => s.pauseTimer);
  const resumeTimer = useTimeStore((s) => s.resumeTimer);
  const deleteProject = useTimeStore((s) => s.deleteProject);
  const getTotalSecondsForProject = useTimeStore((s) => s.getTotalSecondsForProject);
  const getTodayEntriesForProject = useTimeStore((s) => s.getTodayEntriesForProject);

  const project = projects.find((p) => p.id === projectId);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const runningDisplay = useRunningTimer(projectId);
  const totalSeconds = getTotalSecondsForProject(projectId);
  const todayEntries = getTodayEntriesForProject(projectId);

  if (!project) return null;

  const todayTotal = todayEntries.reduce((sum, e) => sum + e.durationSeconds, 0);
  const todayRunning = (project.isRunning || project.isPaused) && project.sessionStartAt
    ? Math.floor((Date.now() - project.sessionStartAt) / 1000)
    : 0;

  const isActive = project.isRunning || project.isPaused;

  return (
    <>
      <div className={`bg-zinc-900/50 border rounded-xl p-4 transition-colors ${
        project.isPaused ? 'border-amber-600/30' : project.isRunning ? 'border-amber-600/50' : 'border-zinc-800 hover:border-zinc-700'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-zinc-100 font-medium text-base truncate">{project.name}</h3>
              {project.isPaused && (
                <span className="text-amber-500/70 text-xs bg-amber-500/10 rounded-full px-2 py-0.5">Paused</span>
              )}
              {project.isRunning && (
                <span className="text-emerald-400/70 text-xs bg-emerald-400/10 rounded-full px-2 py-0.5">Running</span>
              )}
            </div>
            <p className="text-zinc-500 text-xs mt-0.5">Total: {formatTimeShort(totalSeconds)}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {project.isRunning ? (
              <>
                <button
                  onClick={() => setShowAdjust(true)}
                  className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-all"
                  title="Adjust start time"
                >
                  <Clock className="w-4 h-4" />
                </button>
                <button
                  onClick={() => pauseTimer(projectId)}
                  className="p-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded-lg transition-all"
                  title="Pause"
                >
                  <Pause className="w-4 h-4" />
                </button>
                <button
                  onClick={() => stopTimer(projectId)}
                  className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-all"
                  title="End session"
                >
                  <Square className="w-4 h-4" />
                </button>
              </>
            ) : project.isPaused ? (
              <>
                <button
                  onClick={() => resumeTimer(projectId)}
                  className="p-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg transition-all"
                  title="Resume"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={() => stopTimer(projectId)}
                  className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-all"
                  title="End session"
                >
                  <Square className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => startTimer(projectId)}
                  className="p-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded-lg transition-all"
                  title="Start"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-all"
                  title="Delete project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <span className={`timer-font text-2xl font-bold tabular-nums ${
            project.isRunning ? 'text-amber-400' : project.isPaused ? 'text-amber-500/70' : 'text-zinc-400'
          }`}>
            {isActive ? runningDisplay : formatTime(totalSeconds)}
          </span>
          {todayTotal + todayRunning > 0 && (
            <span className="text-xs text-zinc-600">
              Today: {formatTimeShort(todayTotal + todayRunning)}
            </span>
          )}
        </div>
      </div>

      {showAdjust && project.sessionStartAt && (
        <TimeAdjustModal
          projectId={projectId}
          projectName={project.name}
          currentStartAt={project.sessionStartAt}
          onClose={() => setShowAdjust(false)}
        />
      )}

      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowConfirmDelete(false)}>
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-zinc-100 font-semibold text-sm mb-2">Delete Project?</h3>
            <p className="text-zinc-400 text-xs mb-4">
              This will permanently delete <span className="text-zinc-200">{project.name}</span> and all its time entries.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { deleteProject(projectId); setShowConfirmDelete(false); }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-lg py-2 text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
