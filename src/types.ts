export interface Project {
  id: string;
  name: string;
  createdAt: number;
  totalTrackedSeconds: number;
  isRunning: boolean;
  sessionStartAt: number | null;
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
