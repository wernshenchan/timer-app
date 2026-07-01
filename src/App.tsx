import { useState, useEffect, useRef } from 'react';
import { useTimeStore } from '@/store/timeStore';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import AddProjectForm from '@/components/AddProjectForm';
import ProjectCard from '@/components/ProjectCard';
import DailyHistory from '@/components/DailyHistory';
import ReportModal from '@/components/ReportModal';
import QuickAddModal from '@/components/QuickAddModal';
import { Download, Upload, Eye, EyeOff, PlusCircle, Timer } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

function AppContent({ onLogout }: { onLogout: () => void }) {
  const projects = useTimeStore((s) => s.projects);
  const loaded = useTimeStore((s) => s.loaded);
  const exportBackup = useTimeStore((s) => s.exportBackup);
  const importBackup = useTimeStore((s) => s.importBackup);
  const autoStopPastSessions = useTimeStore((s) => s.autoStopPastSessions);
  const [showReport, setShowReport] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-stop paused sessions from previous days
  useEffect(() => {
    autoStopPastSessions();
    const interval = setInterval(autoStopPastSessions, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') autoStopPastSessions();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [autoStopPastSessions]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <Timer className="w-5 h-5 animate-pulse" />
          <span className="text-sm">Loading data...</span>
        </div>
      </div>
    );
  }

  const visibleProjects = (showArchived
    ? projects
    : projects.filter((p) => !p.archived)
  ).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.createdAt - b.createdAt;
  });

  const archivedCount = projects.filter((p) => p.archived).length;
  const hasActiveProjects = projects.some((p) => !p.archived);

  const handleExport = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (importBackup(text)) {
        setImportMsg('Backup restored successfully!');
        setTimeout(() => setImportMsg(''), 3000);
      } else {
        setImportMsg('Invalid backup file.');
        setTimeout(() => setImportMsg(''), 3000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header onReportClick={() => setShowReport(true)} onLogout={onLogout} />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <AddProjectForm />

        {/* Utility bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuickAdd(true)}
              disabled={!hasActiveProjects}
              className="flex items-center gap-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 disabled:bg-zinc-800 disabled:text-zinc-600 text-emerald-400 rounded-lg py-1.5 px-3 transition-colors disabled:cursor-not-allowed"
              title="Manually log a session"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Quick Add
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg py-1.5 px-3 transition-colors"
              title="Download backup"
            >
              <Download className="w-3.5 h-3.5" />
              Backup
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg py-1.5 px-3 transition-colors"
              title="Restore from backup"
            >
              <Upload className="w-3.5 h-3.5" />
              Restore
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            {importMsg && (
              <span className={`text-xs ${importMsg.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>
                {importMsg}
              </span>
            )}
          </div>
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg py-1.5 px-3 transition-colors"
            >
              {showArchived ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showArchived ? 'Hide Archived' : `Archived (${archivedCount})`}
            </button>
          )}
        </div>

        {visibleProjects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-600 text-sm">
              {archivedCount > 0 && !showArchived
                ? 'All projects are archived. Click "Archived" to show them.'
                : 'No projects yet. Add one above to start tracking time.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleProjects.map((project) => (
              <ProjectCard key={project.id} projectId={project.id} />
            ))}
          </div>
        )}

        <DailyHistory />
      </main>

      {showReport && <ReportModal onClose={() => setShowReport(false)} />}
      {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} />}
    </div>
  );
}

function AuthenticatedShell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const init = useTimeStore((s) => s.init);
  const loaded = useTimeStore((s) => s.loaded);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      init(user.id);
    }
  }, [user.id, init, initialized]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <Timer className="w-5 h-5 animate-pulse" />
          <span className="text-sm">Loading data...</span>
        </div>
      </div>
    );
  }

  return <AppContent onLogout={onLogout} />;
}

export default function App() {
  return (
    <AuthGuard>
      {({ user, onLogout }) => <AuthenticatedShell user={user} onLogout={onLogout} />}
    </AuthGuard>
  );
}
