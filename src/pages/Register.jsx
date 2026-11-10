import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import useAuthStore from '../store/useAuthStore';
import { Mail, Lock, User, Loader2, ArrowRight, Sun, Moon, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { useTheme } from '../context/ThemeContext';

// Validation Schema
const registerSchema = z.object({
  name: z.string()
    .min(2, "Name must contain at least 2 characters.")
    .max(50, "Maximum 50 characters allowed.")
    .regex(/^[a-zA-Z\s]*$/, "Name can only contain letters and spaces."),
  email: z.string()
    .min(1, "Email is required.")
    .email("Please enter a valid email address.")
    .max(100, "Maximum 100 characters allowed."),
  password: z.string()
    .min(6, "Password must contain at least 6 characters.")
    .max(72, "Maximum 72 characters allowed.")
});

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { register: registerUser, googleLogin, loading, error, setError, clearError } = useAuthStore();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      password: ''
    }
  });

  const nameValue = watch('name');
  const emailValue = watch('email');
  const passwordValue = watch('password');

  const onSubmit = async (data) => {
    const result = await registerUser(data.name, data.email, data.password);
    if (result && result.requiresVerification) {
      navigate('/verify-email', { state: { email: result.email } });
    } else if (result) {
      navigate('/dashboard');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      setError('Google signup failed: no credential returned by Google');
      return;
    }
    const success = await googleLogin(idToken);
    if (success) navigate('/dashboard');
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0f1115] text-slate-200' : 'bg-[#f7f9fc] text-slate-900'}`}>
      
      {/* Background aesthetics */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>
      
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} className="text-slate-200" /> : <Moon size={18} className="text-slate-600" />}
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-[420px] bg-white dark:bg-[#16181d] p-8 sm:p-10 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800/60 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <img src="/logo.png" alt="SmartSplit Logo" className="h-16 w-auto object-contain drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Create Account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Join the smartest way to split bills</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl mb-6 text-sm flex justify-between items-center border border-red-100 dark:border-red-900/30"
          >
            <span>{error}</span>
            <button onClick={clearError} className="text-red-800 dark:text-red-300 hover:opacity-70 ml-3">×</button>
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name<span className="text-red-500 ml-1">*</span></label>
              <span className="text-[10px] text-slate-400">{nameValue?.length || 0} / 50</span>
            </div>
            <div className="relative group">
              <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.name ? 'text-red-400' : 'text-slate-400 group-focus-within:text-primary-500'}`} size={18} />
              <input
                type="text"
                autoComplete="name"
                {...register("name", {
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  }
                })}
                className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0f1115] border ${errors.name ? 'border-red-300 dark:border-red-500/50 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700/80 focus:border-primary-500 focus:ring-primary-500/20'} rounded-xl focus:ring-4 transition-all outline-none text-sm`}
                placeholder="John Doe"
              />
            </div>
            {errors.name && (
              <p className="text-red-500 text-xs mt-1.5">{errors.name.message}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address<span className="text-red-500 ml-1">*</span></label>
              <span className="text-[10px] text-slate-400">{emailValue?.length || 0} / 100</span>
            </div>
            <div className="relative group">
              <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.email ? 'text-red-400' : 'text-slate-400 group-focus-within:text-primary-500'}`} size={18} />
              <input
                type="email"
                autoComplete="email"
                {...register("email")}
                className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0f1115] border ${errors.email ? 'border-red-300 dark:border-red-500/50 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700/80 focus:border-primary-500 focus:ring-primary-500/20'} rounded-xl focus:ring-4 transition-all outline-none text-sm`}
                placeholder="name@example.com"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password<span className="text-red-500 ml-1">*</span></label>
              <span className="text-[10px] text-slate-400">{passwordValue?.length || 0} / 72</span>
            </div>
            <div className="relative group">
              <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.password ? 'text-red-400' : 'text-slate-400 group-focus-within:text-primary-500'}`} size={18} />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...register("password")}
                className={`w-full pl-10 pr-11 py-3 bg-white dark:bg-[#0f1115] border ${errors.password ? 'border-red-300 dark:border-red-500/50 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700/80 focus:border-primary-500 focus:ring-primary-500/20'} rounded-xl focus:ring-4 transition-all outline-none text-sm`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid || loading}
            className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-all duration-300 ${!isValid || loading ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-400 dark:text-primary-700 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/25 active:scale-[0.98]'}`}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <>Create Account <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="my-7 flex items-center gap-4">
          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">OR</span>
          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google signup failed')}
            theme={theme === 'dark' ? 'filled_black' : 'outline'}
            shape="rectangular"
            size="large"
            width={300}
            text="signup_with"
            use_fedcm_for_prompt={true}
          />
        </div>

        <p className="text-center mt-8 text-slate-600 dark:text-slate-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
