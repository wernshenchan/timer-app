import { create } from 'zustand';
import type { Project, TimeEntry, AppData } from '@/types';

const STORAGE_KEY = 'timeTrackerData';

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Normalize old data without isPaused/pausedAt
      data.projects = (data.projects || []).map((p: Project) => ({
        ...p,
        isPaused: p.isPaused ?? false,
        pausedAt: p.pausedAt ?? null,
      }));
      return data;
    }
  } catch {}
  return { projects: [], timeEntries: [] };
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getDateStr(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getToday(): string {
  return getDateStr(Date.now());
}

interface TimeStore {
  projects: Project[];
  timeEntries: TimeEntry[];
  addProject: (name: string) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  startTimer: (projectId: string) => void;
  stopTimer: (projectId: string) => void;
  pauseTimer: (projectId: string) => void;
  resumeTimer: (projectId: string) => void;
  adjustStartTime: (projectId: string, newStartTime: number) => void;
  editTimeEntry: (entryId: string, newStartTime: number, newEndTime: number) => void;
  setEntryNote: (entryId: string, note: string) => void;
  deleteTimeEntry: (entryId: string) => void;
  getRunningSeconds: (projectId: string) => number;
  getTotalSecondsForProject: (projectId: string) => number;
  getTodayEntriesForProject: (projectId: string) => TimeEntry[];
  getTotalTodaySeconds: () => number;
  autoStopPastSessions: () => void;
}

export const useTimeStore = create<TimeStore>((set, get) => {
  const initial = loadData();

  return {
    projects: initial.projects,
    timeEntries: initial.timeEntries,

    addProject: (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const project: Project = {
        id: generateId(),
        name: trimmed,
        createdAt: Date.now(),
        totalTrackedSeconds: 0,
        isRunning: false,
        isPaused: false,
        sessionStartAt: null,
        pausedAt: null,
      };
      set((state) => {
        const newState = { ...state, projects: [...state.projects, project] };
        saveData({ projects: newState.projects, timeEntries: newState.timeEntries });
        return newState;
      });
    },

    deleteProject: (id: string) => {
      set((state) => {
        const newState = {
          ...state,
          projects: state.projects.filter((p) => p.id !== id),
          timeEntries: state.timeEntries.filter((e) => e.projectId !== id),
        };
        saveData({ projects: newState.projects, timeEntries: newState.timeEntries });
        return newState;
      });
    },

    renameProject: (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      set((state) => {
        const newState = {
          ...state,
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, name: trimmed } : p
          ),
        };
        saveData({ projects: newState.projects, timeEntries: newState.timeEntries });
        return newState;
      });
    },

    startTimer: (projectId: string) => {
      set((state) => {
        const now = Date.now();

        const updatedProjects = state.projects.map((p) => {
          if (p.id === projectId) {
            return { ...p, isRunning: true, isPaused: false, sessionStartAt: now, pausedAt: null };
          }
          // Pause any other running project
          if (p.isRunning && p.id !== projectId && p.sessionStartAt) {
            return { ...p, isRunning: false, isPaused: true, pausedAt: now };
          }
          return p;
        });

        saveData({ projects: updatedProjects, timeEntries: state.timeEntries });
        return { projects: updatedProjects, timeEntries: state.timeEntries };
      });
    },

    stopTimer: (projectId: string) => {
      const state = get();
      const project = state.projects.find((p) => p.id === projectId);
      if (!project || !project.sessionStartAt) return;
      // Must be running or paused
      if (!project.isRunning && !project.isPaused) return;

      const now = Date.now();
      const endTime = project.isPaused && project.pausedAt ? project.pausedAt : now;
      const elapsed = Math.floor((endTime - project.sessionStartAt) / 1000);
      const entry: TimeEntry = {
        id: generateId(),
        projectId,
        startTime: project.sessionStartAt,
        endTime,
        durationSeconds: elapsed,
        date: getDateStr(endTime),
      };

      set((state) => {
        const newTimeEntries = [...state.timeEntries, entry];
        const total = newTimeEntries
          .filter((e) => e.projectId === projectId)
          .reduce((sum, e) => sum + e.durationSeconds, 0);
        const newState = {
          ...state,
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, isRunning: false, isPaused: false, sessionStartAt: null, pausedAt: null, totalTrackedSeconds: total }
              : p
          ),
          timeEntries: newTimeEntries,
        };
        saveData({ projects: newState.projects, timeEntries: newState.timeEntries });
        return newState;
      });
    },

    adjustStartTime: (projectId: string, newStartTime: number) => {
      set((state) => {
        const newState = {
          ...state,
          projects: state.projects.map((p) =>
            p.id === projectId && p.isRunning
              ? { ...p, sessionStartAt: newStartTime }
              : p
          ),
        };
        saveData({ projects: newState.projects, timeEntries: newState.timeEntries });
        return newState;
      });
    },

    pauseTimer: (projectId: string) => {
      set((state) => {
        const now = Date.now();
        const newState = {
          ...state,
          projects: state.projects.map((p) =>
            p.id === projectId && p.isRunning && p.sessionStartAt
              ? { ...p, isRunning: false, isPaused: true, pausedAt: now }
              : p
          ),
        };
        saveData({ projects: newState.projects, timeEntries: newState.timeEntries });
        return newState;
      });
    },

    resumeTimer: (projectId: string) => {
      set((state) => {
        const now = Date.now();
        const newState = {
          ...state,
          projects: state.projects.map((p) => {
            // Pause any other running project
            if (p.isRunning && p.id !== projectId) {
              return { ...p, isRunning: false, isPaused: true, pausedAt: now };
            }
            // Resume the target project
            if (p.id === projectId && p.isPaused && p.sessionStartAt && p.pausedAt) {
              return {
                ...p,
                isRunning: true,
                isPaused: false,
                sessionStartAt: now - (p.pausedAt - p.sessionStartAt),
                pausedAt: null,
              };
            }
            return p;
          }),
        };
        saveData({ projects: newState.projects, timeEntries: newState.timeEntries });
        return newState;
      });
    },

    editTimeEntry: (entryId: string, newStartTime: number, newEndTime: number) => {
      if (newStartTime >= newEndTime) return;
      set((state) => {
        const updatedEntries = state.timeEntries.map((e) => {
          if (e.id !== entryId) return e;
          const d = new Date(newEndTime);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return {
            ...e,
            startTime: newStartTime,
            endTime: newEndTime,
            durationSeconds: Math.floor((newEndTime - newStartTime) / 1000),
            date: dateStr,
          };
        });

        // Recalculate totalTrackedSeconds for the affected project
        const entry = state.timeEntries.find((e) => e.id === entryId);
        const projectId = entry?.projectId;
        const updatedProjects = state.projects.map((p) => {
          if (p.id !== projectId) return p;
          const total = updatedEntries
            .filter((e) => e.projectId === projectId)
            .reduce((sum, e) => sum + e.durationSeconds, 0);
          return { ...p, totalTrackedSeconds: total };
        });

        saveData({ projects: updatedProjects, timeEntries: updatedEntries });
        return { projects: updatedProjects, timeEntries: updatedEntries };
      });
    },

    deleteTimeEntry: (entryId: string) => {
      set((state) => {
        const entry = state.timeEntries.find((e) => e.id === entryId);
        const projectId = entry?.projectId;
        const updatedEntries = state.timeEntries.filter((e) => e.id !== entryId);
        const updatedProjects = state.projects.map((p) => {
          if (p.id !== projectId) return p;
          const total = updatedEntries
            .filter((e) => e.projectId === projectId)
            .reduce((sum, e) => sum + e.durationSeconds, 0);
          return { ...p, totalTrackedSeconds: total };
        });

        saveData({ projects: updatedProjects, timeEntries: updatedEntries });
        return { projects: updatedProjects, timeEntries: updatedEntries };
      });
    },

    setEntryNote: (entryId: string, note: string) => {
      set((state) => {
        const updatedEntries = state.timeEntries.map((e) =>
          e.id === entryId ? { ...e, note: note.trim() || undefined } : e
        );
        saveData({ projects: state.projects, timeEntries: updatedEntries });
        return { ...state, timeEntries: updatedEntries };
      });
    },

    getRunningSeconds: (projectId: string) => {
      const state = get();
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return 0;
      if (project.isPaused && project.pausedAt && project.sessionStartAt) {
        return Math.floor((project.pausedAt - project.sessionStartAt) / 1000);
      }
      if (project.isRunning && project.sessionStartAt) {
        return Math.floor((Date.now() - project.sessionStartAt) / 1000);
      }
      return 0;
    },

    getTotalSecondsForProject: (projectId: string) => {
      const state = get();
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return 0;
      const entriesTotal = state.timeEntries
        .filter((e) => e.projectId === projectId)
        .reduce((sum, e) => sum + e.durationSeconds, 0);
      const running = get().getRunningSeconds(projectId);
      return entriesTotal + running;
    },

    autoStopPastSessions: () => {
      const state = get();
      const today = getToday();
      const now = Date.now();
      const newEntries: TimeEntry[] = [];
      let changed = false;

      const updatedProjects = state.projects.map((p) => {
        if (!p.isPaused || !p.sessionStartAt || !p.pausedAt) return p;
        const sessionDay = getDateStr(p.sessionStartAt);
        // If paused on a previous day, auto-end the session
        if (sessionDay !== today) {
          const endTime = p.pausedAt;
          const elapsed = Math.floor((endTime - p.sessionStartAt) / 1000);
          newEntries.push({
            id: generateId(),
            projectId: p.id,
            startTime: p.sessionStartAt,
            endTime,
            durationSeconds: elapsed,
            date: sessionDay,
          });
          changed = true;
          return {
            ...p,
            isRunning: false,
            isPaused: false,
            sessionStartAt: null,
            pausedAt: null,
            totalTrackedSeconds:
              state.timeEntries
                .filter((e) => e.projectId === p.id)
                .reduce((sum, e) => sum + e.durationSeconds, 0) + elapsed,
          };
        }
        return p;
      });

      if (changed) {
        const newTimeEntries = [...state.timeEntries, ...newEntries];
        saveData({ projects: updatedProjects, timeEntries: newTimeEntries });
        set({ projects: updatedProjects, timeEntries: newTimeEntries });
      }
    },

    getTodayEntriesForProject: (projectId: string) => {
      const state = get();
      const today = getToday();
      return state.timeEntries.filter(
        (e) => e.projectId === projectId && e.date === today
      );
    },

    getTotalTodaySeconds: () => {
      const state = get();
      const today = getToday();
      const entriesTotal = state.timeEntries
        .filter((e) => e.date === today)
        .reduce((sum, e) => sum + e.durationSeconds, 0);
      const runningTotal = state.projects
        .filter((p) => (p.isRunning || p.isPaused) && p.sessionStartAt)
        .reduce((sum, p) => sum + get().getRunningSeconds(p.id), 0);
      return entriesTotal + runningTotal;
    },
  };
});
