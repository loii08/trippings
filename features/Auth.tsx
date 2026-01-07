import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Globe, Sparkles } from 'lucide-react';
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
  const [emailError, setEmailError] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Email validation function
  const validateEmail = async (email: string) => {
    if (!email) {
      setEmailError('');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Check if email already exists (only for signup)
    if (!isLogin) {
      setIsCheckingEmail(true);
      try {
        const exists = await authService.checkEmailExists(email);
        if (exists) {
          setEmailError('This email is already registered');
        } else {
          setEmailError('');
        }
      } catch (err) {
        setEmailError('Failed to validate email');
      } finally {
        setIsCheckingEmail(false);
      }
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        const identifier = email || username;
        await onLogin(identifier, password);
      } else {
        // Final email validation before signup
        if (emailError) {
          setError('Please fix the email errors before continuing');
          return;
        }
        await authService.signup(email, username, password);
        await onLogin(email, password);
      }
    } catch (err: any) {
      if (err.message?.includes('duplicate key') || err.message?.includes('already exists')) {
        setError('An account with this email or username already exists');
      } else {
        setError('Authentication failed. Please check your credentials.');
      }
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
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Main Container */}
      <div className="relative w-full max-w-[440px] md:max-w-[500px] lg:max-w-[540px] z-10">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                Trippings
              </h1>
              <p className="text-sm md:text-base text-secondary font-medium">
                Travel Intelligence Platform
              </p>
            </div>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-3">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-secondary text-sm md:text-base">
            {isLogin 
              ? 'Sign in to access your travel dashboard' 
              : 'Start your journey with intelligent trip planning'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-3xl shadow-xl border border-custom p-6 md:p-8 lg:p-10">
          {/* Mode Toggle */}
          <div className="flex bg-primary-soft rounded-2xl p-1 mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isLogin 
                  ? 'bg-surface shadow-sm text-primary' 
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                !isLogin 
                  ? 'bg-surface shadow-sm text-primary' 
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Mail className="w-5 h-5 text-muted" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      validateEmail(e.target.value);
                    }}
                    onBlur={() => validateEmail(email)}
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl border transition-all duration-200 bg-primary-soft focus:bg-surface focus:ring-2 focus:ring-primary/20 outline-none text-primary placeholder:text-muted ${
                      emailError 
                        ? 'border-error focus:ring-error/20' 
                        : 'border-custom focus:border-primary'
                    }`}
                  />
                </div>
                {emailError && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    {isCheckingEmail ? (
                      <div className="w-4 h-4 border-2 border-warning border-t-warning rounded-full animate-spin" />
                    ) : (
                      <div className="w-4 h-4 text-error">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <span className={`${emailError.includes('already') ? 'text-error' : 'text-warning'} font-medium`}>
                      {emailError}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-secondary">
                {isLogin ? 'Username or Email' : 'Username'}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <User className="w-5 h-5 text-muted" />
                </div>
                <input
                  type="text"
                  required
                  placeholder={isLogin ? "username or email" : "choose a username"}
                  value={isLogin ? (email || username) : username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-custom bg-primary-soft focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-primary placeholder:text-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-secondary">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:text-primary-hover"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Lock className="w-5 h-5 text-muted" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-custom bg-primary-soft focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-primary placeholder:text-muted"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-error/10 border border-error/20">
                <p className="text-sm font-medium text-error text-center">{error}</p>
              </div>
            )}

            {emailError && !error && (
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
                <p className="text-sm font-medium text-warning text-center">{emailError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-primary hover:bg-primary-hover text-inverse font-semibold py-3.5 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-inverse/30 border-t-inverse rounded-full animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-custom" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-surface text-sm font-medium text-muted">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Login */}
          <div>
            <button 
              onClick={handleGoogleClick}
              disabled={true}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-custom bg-primary-soft text-secondary font-medium hover:bg-surface hover:border-primary transition-all duration-200 cursor-not-allowed opacity-60"
            >
              <div className="w-5 h-5">
                <Globe className="w-full h-full text-muted" />
              </div>
              Google Sign-In (Coming Soon)
            </button>
          </div>

          {/* Terms */}
          <div className="mt-8 pt-6 border-t border-custom text-center">
            <p className="text-xs text-muted">
              By continuing, you agree to our{' '}
              <button className="text-primary font-medium hover:text-primary-hover">
                Terms of Service
              </button>{' '}
              and{' '}
              <button className="text-primary font-medium hover:text-primary-hover">
                Privacy Policy
              </button>
            </p>
          </div>

          {/* Switch Mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-secondary">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-semibold hover:text-primary-hover transition-colors"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} Trippings. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;