'use client';

import { supabase } from '@/lib/supabase';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard',
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">MavsTracker</h1>
          <p className="text-slate-500">Welcome back! Please sign in to continue.</p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 py-3 px-4 rounded-xl font-semibold hover:bg-slate-50 transition-all active:scale-[0.98]"
        >
          <LogIn className="w-5 h-5 text-blue-600" />
          Continue with Google
        </button>

        <p className="mt-6 text-center text-xs text-slate-400">
          Only @themavericksindia.com accounts are allowed.
        </p>
      </div>
    </div>
  );
}
