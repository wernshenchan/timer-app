import { useTimeStore } from '@/store/timeStore';
import { PROJECT_COLORS } from '@/types';

interface Props {
  projectId: string;
  currentColor?: string;
  onClose: () => void;
}

export default function ColorPicker({ projectId, currentColor, onClose }: Props) {
  const updateProject = useTimeStore((s) => s.updateProject);

  return (
    <div className="absolute mt-10 ml-2 bg-zinc-800 border border-zinc-700 rounded-lg p-2 shadow-xl z-20 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
      {PROJECT_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => { updateProject(projectId, { color: currentColor === c ? undefined : c }); onClose(); }}
          className={`w-5 h-5 rounded-full transition-all hover:scale-125 ${
            currentColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-800' : ''
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}
