import { create } from 'zustand';
import type { Project, TimeEntry, AppData } from '@/types';

const STORAGE_KEY = 'timeTrackerData';

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { projects: [], timeEntries: [] };
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface TimeStore {
  projects: Project[];
  timeEntries: TimeEntry[];
  addProject: (name: string) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  startTimer: (projectId: string) => void;
  stopTimer: (projectId: string) => void;
  adjustStartTime: (projectId: string, newStartTime: number) => void;
  editTimeEntry: (entryId: string, newStartTime: number, newEndTime: number) => void;
  setEntryNote: (entryId: string, note: string) => void;
  deleteTimeEntry: (entryId: string) => void;
  getRunningSeconds: (projectId: string) => number;
  getTotalSecondsForProject: (projectId: string) => number;
  getTodayEntriesForProject: (projectId: string) => TimeEntry[];
  getTotalTodaySeconds: () => number;
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
        sessionStartAt: null,
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

        // Gather entries for any other running projects being stopped
        const entries: TimeEntry[] = [];
        for (const p of state.projects) {
          if (p.isRunning && p.id !== projectId && p.sessionStartAt) {
            const elapsed = Math.floor((now - p.sessionStartAt) / 1000);
            entries.push({
              id: generateId(),
              projectId: p.id,
              startTime: p.sessionStartAt,
              endTime: now,
              durationSeconds: elapsed,
              date: getToday(),
            });
          }
        }

        const newTimeEntries = [...state.timeEntries, ...entries];

        // Recalculate totals for projects that were stopped
        const stoppedIds = new Set(entries.map((e) => e.projectId));
        const updatedProjects = state.projects.map((p) => {
          if (p.id === projectId) {
            return { ...p, isRunning: true, sessionStartAt: now };
          }
          if (stoppedIds.has(p.id)) {
            const total = newTimeEntries
              .filter((e) => e.projectId === p.id)
              .reduce((sum, e) => sum + e.durationSeconds, 0);
            return { ...p, isRunning: false, sessionStartAt: null, totalTrackedSeconds: total };
          }
          return p;
        });

        saveData({ projects: updatedProjects, timeEntries: newTimeEntries });
        return { projects: updatedProjects, timeEntries: newTimeEntries };
      });
    },

    stopTimer: (projectId: string) => {
      const state = get();
      const project = state.projects.find((p) => p.id === projectId);
      if (!project || !project.isRunning || !project.sessionStartAt) return;

      const now = Date.now();
      const elapsed = Math.floor((now - project.sessionStartAt) / 1000);
      const entry: TimeEntry = {
        id: generateId(),
        projectId,
        startTime: project.sessionStartAt,
        endTime: now,
        durationSeconds: elapsed,
        date: getToday(),
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
              ? { ...p, isRunning: false, sessionStartAt: null, totalTrackedSeconds: total }
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

    editTimeEntry: (entryId: string, newStartTime: number, newEndTime: number) => {
      if (newStartTime >= newEndTime) return;
      set((state) => {
        const updatedEntries = state.timeEntries.map((e) => {
          if (e.id !== entryId) return e;
          const d = new Date(e.endTime);
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
      if (!project || !project.isRunning || !project.sessionStartAt) return 0;
      return Math.floor((Date.now() - project.sessionStartAt) / 1000);
    },

    getTotalSecondsForProject: (projectId: string) => {
      const state = get();
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return 0;
      const entriesTotal = state.timeEntries
        .filter((e) => e.projectId === projectId)
        .reduce((sum, e) => sum + e.durationSeconds, 0);
      const running = project.isRunning && project.sessionStartAt
        ? Math.floor((Date.now() - project.sessionStartAt) / 1000)
        : 0;
      return entriesTotal + running;
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
        .filter((p) => p.isRunning && p.sessionStartAt)
        .reduce((sum, p) => sum + Math.floor((Date.now() - (p.sessionStartAt || Date.now())) / 1000), 0);
      return entriesTotal + runningTotal;
    },
  };
});
