export interface Project {
  id: string;
  name: string;
  createdAt: number;
  totalTrackedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  sessionStartAt: number | null;
  pausedAt: number | null;
  color?: string;
  archived?: boolean;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  date: string;
  note?: string;
}

export interface AppData {
  projects: Project[];
  timeEntries: TimeEntry[];
}

export const PROJECT_COLORS = [
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
];
