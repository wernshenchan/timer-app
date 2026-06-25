import { useState } from 'react';
import { useTimeStore } from '@/store/timeStore';
import { Plus } from 'lucide-react';

export default function AddProjectForm() {
  const [name, setName] = useState('');
  const addProject = useTimeStore((s) => s.addProject);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProject(name);
    setName('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add a new project..."
        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 transition-all text-sm"
        maxLength={50}
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-medium rounded-lg px-4 py-2.5 transition-all flex items-center gap-1.5 text-sm disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
        Add
      </button>
    </form>
  );
}
