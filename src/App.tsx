import { useState } from 'react';
import { useTimeStore } from '@/store/timeStore';
import Header from '@/components/Header';
import AddProjectForm from '@/components/AddProjectForm';
import ProjectCard from '@/components/ProjectCard';
import DailyHistory from '@/components/DailyHistory';
import ReportModal from '@/components/ReportModal';

export default function App() {
  const projects = useTimeStore((s) => s.projects);
  const [showReport, setShowReport] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header onReportClick={() => setShowReport(true)} />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <AddProjectForm />

        {projects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-600 text-sm">No projects yet. Add one above to start tracking time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} projectId={project.id} />
            ))}
          </div>
        )}

        <DailyHistory />
      </main>

      {showReport && <ReportModal onClose={() => setShowReport(false)} />}
    </div>
  );
}
