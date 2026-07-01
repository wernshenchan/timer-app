import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Project, TimeEntry } from '@/types';

const STORAGE_KEY = 'timeTrackerData';

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

function toSupabaseProject(p: Project, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    created_at: new Date(p.createdAt).toISOString(),
    total_tracked_seconds: p.totalTrackedSeconds,
    is_running: p.isRunning,
    is_paused: p.isPaused ?? false,
    session_start_at: p.sessionStartAt ? new Date(p.sessionStartAt).toISOString() : null,
    paused_at: p.pausedAt ? new Date(p.pausedAt).toISOString() : null,
    color: p.color ?? null,
    archived: p.archived ?? false,
    pinned: p.pinned ?? false,
    updated_at: new Date().toISOString(),
  };
}

function fromSupabaseProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at).getTime(),
    totalTrackedSeconds: row.total_tracked_seconds ?? 0,
    isRunning: row.is_running ?? false,
    isPaused: row.is_paused ?? false,
    sessionStartAt: row.session_start_at ? new Date(row.session_start_at).getTime() : null,
    pausedAt: row.paused_at ? new Date(row.paused_at).getTime() : null,
    color: row.color ?? undefined,
    archived: row.archived ?? false,
    pinned: row.pinned ?? false,
  };
}

function toSupabaseEntry(e: TimeEntry, userId: string) {
  return {
    id: e.id,
    user_id: userId,
    project_id: e.projectId,
    start_time: new Date(e.startTime).toISOString(),
    end_time: new Date(e.endTime).toISOString(),
    duration_seconds: e.durationSeconds,
    date: e.date,
    note: e.note ?? null,
  };
}

function fromSupabaseEntry(row: any): TimeEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    startTime: new Date(row.start_time).getTime(),
    endTime: new Date(row.end_time).getTime(),
    durationSeconds: row.duration_seconds ?? 0,
    date: row.date,
    note: row.note ?? undefined,
  };
}

interface TimeStore {
  projects: Project[];
  timeEntries: TimeEntry[];
  loaded: boolean;
  userId: string | null;
  init: (userId: string) => Promise<void>;
  addProject: (name: string) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  updateProject: (id: string, changes: Partial<Project>) => void;
  archiveProject: (id: string) => void;
  unarchiveProject: (id: string) => void;
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
  addTimeEntry: (projectId: string, startTime: number, endTime: number, note?: string) => void;
  exportBackup: () => string;
  importBackup: (json: string) => boolean;
}

// Local cache helpers
function saveCache(data: { projects: Project[]; timeEntries: TimeEntry[] }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function loadCache(): { projects: Project[]; timeEntries: TimeEntry[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export const useTimeStore = create<TimeStore>((set, get) => ({
  projects: [],
  timeEntries: [],
  loaded: false,
  userId: null,

  init: async (userId: string) => {
    set({ userId, loaded: false });

    try {
      // Load projects from Supabase
      const { data: projectRows, error: pErr } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId);

      if (pErr) throw pErr;

      // Load time entries from Supabase
      const { data: entryRows, error: eErr } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId);

      if (eErr) throw eErr;

      const projects = (projectRows || []).map(fromSupabaseProject);
      const timeEntries = (entryRows || []).map(fromSupabaseEntry);

      // Check if there's existing localStorage data to migrate
      if (projects.length === 0 && timeEntries.length === 0) {
        const cache = loadCache();
        if (cache && cache.projects.length > 0) {
          // Migrate localStorage data to Supabase
          for (const p of cache.projects) {
            const { error } = await supabase
              .from('projects')
              .insert(toSupabaseProject(p, userId));
            if (error) console.error('Migration project error:', error);
          }
          for (const e of cache.timeEntries) {
            const { error } = await supabase
              .from('time_entries')
              .insert(toSupabaseEntry(e, userId));
            if (error) console.error('Migration entry error:', error);
          }
          // Re-fetch after migration
          const { data: pRows2 } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', userId);
          const { data: eRows2 } = await supabase
            .from('time_entries')
            .select('*')
            .eq('user_id', userId);
          set({
            projects: (pRows2 || []).map(fromSupabaseProject),
            timeEntries: (eRows2 || []).map(fromSupabaseEntry),
            loaded: true,
          });
          saveCache({
            projects: (pRows2 || []).map(fromSupabaseProject),
            timeEntries: (eRows2 || []).map(fromSupabaseEntry),
          });
          return;
        }
      }

      set({ projects, timeEntries, loaded: true });
      saveCache({ projects, timeEntries });
    } catch (err) {
      console.error('Failed to load from Supabase, trying cache:', err);
      // Fallback to localStorage cache
      const cache = loadCache();
      if (cache) {
        set({ projects: cache.projects, timeEntries: cache.timeEntries, loaded: true });
      } else {
        set({ loaded: true });
      }
    }
  },

  addProject: (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { userId } = get();
    const project: Project = {
      id: generateId(),
      name: trimmed,
      createdAt: Date.now(),
      totalTrackedSeconds: 0,
      isRunning: false,
      isPaused: false,
      sessionStartAt: null,
      pausedAt: null,
      pinned: false,
    };
    set((state) => {
      const newState = { ...state, projects: [...state.projects, project] };
      saveCache({ projects: newState.projects, timeEntries: newState.timeEntries });
      // Sync to Supabase
      if (userId) {
        supabase.from('projects').insert(toSupabaseProject(project, userId)).then(({ error }) => {
          if (error) console.error('Supabase insert error:', error);
        });
      }
      return newState;
    });
  },

  deleteProject: (id: string) => {
    const { userId } = get();
    set((state) => {
      const newState = {
        ...state,
        projects: state.projects.filter((p) => p.id !== id),
        timeEntries: state.timeEntries.filter((e) => e.projectId !== id),
      };
      saveCache({ projects: newState.projects, timeEntries: newState.timeEntries });
      if (userId) {
        supabase.from('projects').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase delete error:', error);
        });
        supabase.from('time_entries').delete().eq('project_id', id).then(({ error }) => {
          if (error) console.error('Supabase entries delete error:', error);
        });
      }
      return newState;
    });
  },

  renameProject: (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { userId } = get();
    set((state) => {
      const newState = {
        ...state,
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, name: trimmed } : p
        ),
      };
      saveCache({ projects: newState.projects, timeEntries: newState.timeEntries });
      if (userId) {
        supabase.from('projects').update({ name: trimmed, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase rename error:', error);
        });
      }
      return newState;
    });
  },

  updateProject: (id: string, changes: Partial<Project>) => {
    const { userId } = get();
    set((state) => {
      const newState = {
        ...state,
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...changes } : p
        ),
      };
      saveCache({ projects: newState.projects, timeEntries: newState.timeEntries });
      if (userId) {
        const supabaseUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
        if (changes.name !== undefined) supabaseUpdate.name = changes.name;
        if (changes.totalTrackedSeconds !== undefined) supabaseUpdate.total_tracked_seconds = changes.totalTrackedSeconds;
        if (changes.isRunning !== undefined) supabaseUpdate.is_running = changes.isRunning;
        if (changes.isPaused !== undefined) supabaseUpdate.is_paused = changes.isPaused;
        if (changes.sessionStartAt !== undefined) supabaseUpdate.session_start_at = changes.sessionStartAt ? new Date(changes.sessionStartAt).toISOString() : null;
        if (changes.pausedAt !== undefined) supabaseUpdate.paused_at = changes.pausedAt ? new Date(changes.pausedAt).toISOString() : null;
        if (changes.color !== undefined) supabaseUpdate.color = changes.color ?? null;
        if (changes.archived !== undefined) supabaseUpdate.archived = changes.archived;
        if (changes.pinned !== undefined) supabaseUpdate.pinned = changes.pinned;
        supabase.from('projects').update(supabaseUpdate).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase update error:', error);
        });
      }
      return newState;
    });
  },

  archiveProject: (id: string) => {
    const { userId } = get();
    set((state) => {
      const newState = {
        ...state,
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, archived: true } : p
        ),
      };
      saveCache({ projects: newState.projects, timeEntries: newState.timeEntries });
      if (userId) {
        supabase.from('projects').update({ archived: true, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase archive error:', error);
        });
      }
      return newState;
    });
  },

  unarchiveProject: (id: string) => {
    const { userId } = get();
    set((state) => {
      const newState = {
        ...state,
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, archived: false } : p
        ),
      };
      saveCache({ projects: newState.projects, timeEntries: newState.timeEntries });
      if (userId) {
        supabase.from('projects').update({ archived: false, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase unarchive error:', error);
        });
      }
      return newState;
    });
  },

  startTimer: (projectId: string) => {
    const { userId } = get();
    set((state) => {
      const now = Date.now();
      const updatedProjects = state.projects.map((p) => {
        if (p.id === projectId) {
          return { ...p, isRunning: true, isPaused: false, sessionStartAt: now, pausedAt: null };
        }
        if (p.isRunning && p.id !== projectId && p.sessionStartAt) {
          return { ...p, isRunning: false, isPaused: true, pausedAt: now };
        }
        return p;
      });
      saveCache({ projects: updatedProjects, timeEntries: state.timeEntries });
      if (userId) {
        const nowIso = new Date().toISOString();
        for (const p of updatedProjects) {
          const update: Record<string, any> = { updated_at: nowIso };
          if (p.id === projectId) {
            update.is_running = true;
            update.is_paused = false;
            update.session_start_at = nowIso;
            update.paused_at = null;
          } else if (p.isPaused && p.pausedAt) {
            // Paused — we already updated local state, just sync
            update.is_running = false;
            update.is_paused = true;
            update.paused_at = new Date(p.pausedAt).toISOString();
          }
          supabase.from('projects').update(update).eq('id', p.id).then(({ error }) => {
            if (error) console.error('Supabase startTimer error:', error);
          });
        }
      }
      return { projects: updatedProjects, timeEntries: state.timeEntries };
    });
  },

  stopTimer: (projectId: string) => {
    const state = get();
    const { userId } = state;
    const project = state.projects.find((p) => p.id === projectId);
    if (!project || !project.sessionStartAt) return;
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
      saveCache({ projects: newState.projects, timeEntries: newState.timeEntries });
      if (userId) {
        const nowIso = new Date().toISOString();
        supabase.from('projects').update({
          is_running: false,
          is_paused: false,
          session_start_at: null,
          paused_at: null,
          total_tracked_seconds: total,
          updated_at: nowIso,
        }).eq('id', projectId).then(({ error }) => {
          if (error) console.error('Supabase stopTimer project error:', error);
        });
        supabase.from('time_entries').insert(toSupabaseEntry(entry, userId)).then(({ error }) => {
          if (error) console.error('Supabase stopTimer entry error:', error);
        });
      }
      return newState;
    });
  },

  adjustStartTime: (projectId: string, newStartTime: number) => {
    const { userId } = get();
    set((state) => {
      const newState = {
        ...state,
        projects: state.projects.map((p) =>
          p.id === projectId && p.isRunning
            ? { ...p, sessionStartAt: newStartTime }
            : p
        ),
      };
      saveCache({ projects: newState.projects, timeEntries: newState.timeEntries });
      if (userId) {
        supabase.from('projects').update({
          session_start_at: new Date(newStartTime).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', projectId).then(({ error }) => {
          if (error) console.error('Supabase adjustStartTime error:', error);
        });
      }
      return newState;
    });
  },

  pauseTimer: (projectId: string) => {
    const { userId } = get();
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
      saveCache({ projects: newState.projects, timeEntries: newState.timeEntries });
      if (userId) {
        supabase.from('projects').update({
          is_running: false,
          is_paused: true,
          paused_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', projectId).then(({ error }) => {
          if (error) console.error('Supabase pauseTimer error:', error);
        });
      }
      return newState;
    });
  },

  resumeTimer: (projectId: string) => {
    const { userId } = get();
    set((state) => {
      const now = Date.now();
      const newState = {
        ...state,
        projects: state.projects.map((p) => {
          if (p.isRunning && p.id !== projectId) {
            return { ...p, isRunning: false, isPaused: true, pausedAt: now };
          }
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
      saveCache({ projects: newState.projects, timeEntries: newState.timeEntries });
      if (userId) {
        const nowIso = new Date().toISOString();
        for (const p of newState.projects) {
          const update: Record<string, any> = { updated_at: nowIso };
          if (p.id === projectId && p.isRunning) {
            update.is_running = true;
            update.is_paused = false;
            update.session_start_at = new Date(p.sessionStartAt!).toISOString();
            update.paused_at = null;
          } else if (p.isPaused && p.pausedAt) {
            update.is_running = false;
            update.is_paused = true;
            update.paused_at = new Date(p.pausedAt).toISOString();
          }
          supabase.from('projects').update(update).eq('id', p.id).then(({ error }) => {
            if (error) console.error('Supabase resumeTimer error:', error);
          });
        }
      }
      return newState;
    });
  },

  editTimeEntry: (entryId: string, newStartTime: number, newEndTime: number) => {
    if (newStartTime >= newEndTime) return;
    const { userId } = get();
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

      const entry = state.timeEntries.find((e) => e.id === entryId);
      const projectId = entry?.projectId;
      const updatedProjects = state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const total = updatedEntries
          .filter((e) => e.projectId === projectId)
          .reduce((sum, e) => sum + e.durationSeconds, 0);
        return { ...p, totalTrackedSeconds: total };
      });

      saveCache({ projects: updatedProjects, timeEntries: updatedEntries });
      if (userId) {
        supabase.from('time_entries').update({
          start_time: new Date(newStartTime).toISOString(),
          end_time: new Date(newEndTime).toISOString(),
          duration_seconds: Math.floor((newEndTime - newStartTime) / 1000),
          date: getDateStr(newEndTime),
        }).eq('id', entryId).then(({ error }) => {
          if (error) console.error('Supabase editTimeEntry error:', error);
        });
        if (projectId) {
          const total = updatedEntries
            .filter((e) => e.projectId === projectId)
            .reduce((sum, e) => sum + e.durationSeconds, 0);
          supabase.from('projects').update({
            total_tracked_seconds: total,
            updated_at: new Date().toISOString(),
          }).eq('id', projectId).then(({ error }) => {
            if (error) console.error('Supabase editTimeEntry project update error:', error);
          });
        }
      }
      return { projects: updatedProjects, timeEntries: updatedEntries };
    });
  },

  deleteTimeEntry: (entryId: string) => {
    const { userId } = get();
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

      saveCache({ projects: updatedProjects, timeEntries: updatedEntries });
      if (userId) {
        supabase.from('time_entries').delete().eq('id', entryId).then(({ error }) => {
          if (error) console.error('Supabase deleteTimeEntry error:', error);
        });
        if (projectId) {
          const total = updatedEntries
            .filter((e) => e.projectId === projectId)
            .reduce((sum, e) => sum + e.durationSeconds, 0);
          supabase.from('projects').update({
            total_tracked_seconds: total,
            updated_at: new Date().toISOString(),
          }).eq('id', projectId).then(({ error }) => {
            if (error) console.error('Supabase deleteTimeEntry project update error:', error);
          });
        }
      }
      return { projects: updatedProjects, timeEntries: updatedEntries };
    });
  },

  setEntryNote: (entryId: string, note: string) => {
    const { userId } = get();
    set((state) => {
      const updatedEntries = state.timeEntries.map((e) =>
        e.id === entryId ? { ...e, note: note.trim() || undefined } : e
      );
      saveCache({ projects: state.projects, timeEntries: updatedEntries });
      if (userId) {
        supabase.from('time_entries').update({
          note: note.trim() || null,
        }).eq('id', entryId).then(({ error }) => {
          if (error) console.error('Supabase setEntryNote error:', error);
        });
      }
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
    const { userId } = state;
    const today = getToday();
    const now = Date.now();
    const newEntries: TimeEntry[] = [];
    let changed = false;

    const updatedProjects = state.projects.map((p) => {
      if (!p.isPaused || !p.sessionStartAt || !p.pausedAt) return p;
      const sessionDay = getDateStr(p.sessionStartAt);
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
      saveCache({ projects: updatedProjects, timeEntries: newTimeEntries });
      set({ projects: updatedProjects, timeEntries: newTimeEntries });
      // Sync to Supabase
      if (userId) {
        const nowIso = new Date().toISOString();
        for (const entry of newEntries) {
          supabase.from('time_entries').insert(toSupabaseEntry(entry, userId)).then(({ error }) => {
            if (error) console.error('Supabase autoStop entry error:', error);
          });
        }
        for (const p of updatedProjects) {
          if (newEntries.some((e) => e.projectId === p.id)) {
            supabase.from('projects').update({
              is_running: false,
              is_paused: false,
              session_start_at: null,
              paused_at: null,
              total_tracked_seconds: p.totalTrackedSeconds,
              updated_at: nowIso,
            }).eq('id', p.id).then(({ error }) => {
              if (error) console.error('Supabase autoStop project error:', error);
            });
          }
        }
      }
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

  addTimeEntry: (projectId: string, startTime: number, endTime: number, note?: string) => {
    const { userId } = get();
    set((state) => {
      const entry: TimeEntry = {
        id: generateId(),
        projectId,
        startTime,
        endTime,
        durationSeconds: Math.max(0, Math.floor((endTime - startTime) / 1000)),
        date: getDateStr(endTime),
        note: note?.trim() || undefined,
      };
      const newTimeEntries = [...state.timeEntries, entry];
      const total = newTimeEntries
        .filter((e) => e.projectId === projectId)
        .reduce((sum, e) => sum + e.durationSeconds, 0);
      const newState = {
        ...state,
        timeEntries: newTimeEntries,
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, totalTrackedSeconds: total } : p
        ),
      };
      saveCache({ projects: newState.projects, timeEntries: newState.timeEntries });
      if (userId) {
        supabase.from('time_entries').insert(toSupabaseEntry(entry, userId)).then(({ error }) => {
          if (error) console.error('Supabase addTimeEntry error:', error);
        });
        supabase.from('projects').update({
          total_tracked_seconds: total,
          updated_at: new Date().toISOString(),
        }).eq('id', projectId).then(({ error }) => {
          if (error) console.error('Supabase addTimeEntry project update error:', error);
        });
      }
      return newState;
    });
  },

  exportBackup: () => {
    const state = get();
    return JSON.stringify({ projects: state.projects, timeEntries: state.timeEntries }, null, 2);
  },

  importBackup: (json: string) => {
    try {
      const data = JSON.parse(json);
      if (!data.projects || !data.timeEntries) return false;
      data.projects = data.projects.map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string,
        createdAt: p.createdAt as number,
        totalTrackedSeconds: p.totalTrackedSeconds as number,
        isRunning: p.isRunning as boolean,
        isPaused: (p.isPaused as boolean) ?? false,
        sessionStartAt: (p.sessionStartAt as number) ?? null,
        pausedAt: (p.pausedAt as number) ?? null,
        color: p.color as string | undefined,
        archived: (p.archived as boolean) ?? false,
        pinned: (p.pinned as boolean) ?? false,
      }));
      saveCache({ projects: data.projects, timeEntries: data.timeEntries });
      set({ projects: data.projects, timeEntries: data.timeEntries });
      // Sync to Supabase if user is logged in
      const { userId } = get();
      if (userId) {
        for (const p of data.projects) {
          supabase.from('projects').upsert(toSupabaseProject(p, userId)).then(({ error }) => {
            if (error) console.error('Supabase import project error:', error);
          });
        }
        for (const e of data.timeEntries) {
          supabase.from('time_entries').upsert(toSupabaseEntry(e, userId)).then(({ error }) => {
            if (error) console.error('Supabase import entry error:', error);
          });
        }
      }
      return true;
    } catch {
      return false;
    }
  },
}));
