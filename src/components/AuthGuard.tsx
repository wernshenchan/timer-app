import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { LogIn, LogOut, Github, Timer } from 'lucide-react';

interface AuthGuardProps {
  children: (user: User) => ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin + '/timer-app/',
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <Timer className="w-5 h-5 animate-pulse" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="flex items-center justify-center gap-3 text-zinc-100">
            <Timer className="w-8 h-8 text-emerald-400" />
            <h1 className="text-xl font-semibold">Time Tracker</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            Sign in with GitHub to access your time tracker.
          </p>
          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg py-2.5 px-5 text-sm transition-colors"
          >
            <Github className="w-5 h-5" />
            Sign in with GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Logout button — fixed top-right corner */}
      <button
        onClick={handleLogout}
        className="fixed top-3 right-3 z-50 flex items-center gap-1.5 text-xs bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 rounded-lg py-1.5 px-3 transition-colors"
        title="Sign out"
      >
        <LogOut className="w-3.5 h-3.5" />
        Sign out
      </button>
      {children(user)}
    </>
  );
}
