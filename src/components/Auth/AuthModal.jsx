import React, { useState } from 'react';
import { X, Lock, Mail, User, LogIn, UserPlus, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../../services/apiClient';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, isServerOnline = true }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const data = await api.signup(name, email, password);
        onAuthSuccess(data.user);
        onClose();
      } else {
        const data = await api.login(email, password);
        onAuthSuccess(data.user);
        onClose();
      }
    } catch (err) {
      setError(err.data?.error || err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (demoEmail, demoPw) => {
    setEmail(demoEmail);
    setPassword(demoPw);
    setName(demoEmail.split('@')[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/10 shadow-2xl relative text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-sora font-bold text-lg text-white">
              {mode === 'login' ? 'Sign In to SyncFlow' : 'Create an Account'}
            </h3>
            <p className="text-xs text-slate-400">Save workloads, view run history & SQL leaderboard</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#13131F] p-1 rounded-xl mb-5 border border-white/5">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Server Offline Notice */}
        {!isServerOnline && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200">Backend Server Offline</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Database and auth require running <code className="bg-black/30 px-1 py-0.5 rounded text-white font-mono">npm run server</code> locally. (Static hosts like GitHub Pages do not run Node.js/SQLite).
              </p>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alan Turing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input text-xs pl-9 pr-3 py-2 rounded-xl text-slate-100 placeholder-slate-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input text-xs pl-9 pr-3 py-2 rounded-xl text-slate-100 placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input text-xs pl-9 pr-3 py-2 rounded-xl text-slate-100 placeholder-slate-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 mt-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-pink-500 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="animate-spin text-sm">⏳</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Quick Fill Helper */}
        <div className="mt-5 pt-4 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Demo credentials (click to pre-fill):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleDemoFill('alice@gehu.ac.in', 'demo_password_123')}
              className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-purple-300 border border-white/10 transition-all"
            >
              alice@gehu.ac.in
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('bob@gehu.ac.in', 'demo_password_123')}
              className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-pink-300 border border-white/10 transition-all"
            >
              bob@gehu.ac.in
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
