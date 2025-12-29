
import React, { useState } from 'react';
import { Compass, Mail, Lock, User, ArrowRight, Github, Chrome, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';

interface AuthProps {
  onLogin: (identifier: string, password?: string) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onGoogleLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        const identifier = email || username;
        await onLogin(identifier, password);
      } else {
        await authService.signup(email, username, password);
        await onLogin(email, password);
      }
    } catch (err) {
      setError('Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setGoogleLoading(true);
    try {
      await onGoogleLogin();
    } catch (err) {
      setError('Google Sign-In is not available in local mode.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30">
        <div className="absolute top-[10%] left-[5%] w-72 h-72 bg-indigo-400 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[10%] right-[5%] w-96 h-96 bg-purple-400 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        
        {/* Left Side: Branding/Hero */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-indigo-600 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full -mr-20 -mt-20 opacity-50 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Compass size={24} className="text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">Trippings</span>
            </div>
            <h1 className="text-4xl font-extrabold leading-tight mb-4 text-white">
              Your journeys, <br />
              perfectly synced.
            </h1>
            <p className="text-indigo-100 text-lg">
              The ultimate tool for modern travelers. Plan itineraries, track expenses, and discover more.
            </p>
          </div>

          <div className="relative z-10 flex gap-8">
            <div>
              <p className="text-3xl font-bold">10k+</p>
              <p className="text-sm text-indigo-200">Active Explorers</p>
            </div>
            <div>
              <p className="text-3xl font-bold">50k+</p>
              <p className="text-sm text-indigo-200">Trips Planned</p>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white dark:bg-slate-900">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              {isLogin ? 'Enter your details to access your trips.' : 'Start your next adventure with Trippings.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                    <Mail size={16} className="text-slate-500 dark:text-slate-400" />
                  </div>
                </div>
                <input
                  type="email"
                  required
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-16 pr-4 py-4 rounded-3xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-600 outline-none dark:text-white"
                />
              </div>
            )}
            
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                  <User size={16} className="text-slate-500 dark:text-slate-400" />
                </div>
              </div>
              <input
                type="text"
                required
                placeholder={isLogin ? "Username or Email" : "Username"}
                value={isLogin ? (email || username) : username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-16 pr-4 py-4 rounded-3xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-600 outline-none dark:text-white"
              />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                  <Lock size={16} className="text-slate-500 dark:text-slate-400" />
                </div>
              </div>
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-16 pr-4 py-4 rounded-3xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-600 outline-none dark:text-white"
              />
            </div>

            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-3xl shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {loading ? (isLogin ? 'Authenticating...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Create Account')}
              {!loading && !googleLoading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-8 relative text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
            <span className="relative bg-white dark:bg-slate-900 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">or continue with</span>
          </div>

          <div className="mt-6">
            <button 
              onClick={handleGoogleClick}
              disabled={true}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold cursor-not-allowed"
            >
              <div className="w-5 h-5 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center">
                <Chrome size={16} className="text-slate-600 dark:text-slate-400" />
              </div>
              Google Sign-In (Unavailable)
            </button>
          </div>

          <p className="mt-10 text-center text-slate-500 dark:text-slate-400 font-medium">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 font-bold hover:underline"
            >
              {isLogin ? 'Sign up now' : 'Sign in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
