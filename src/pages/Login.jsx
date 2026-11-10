import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import useAuthStore from '../store/useAuthStore';
import { Mail, Lock, Loader2, ArrowRight, Sun, Moon, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { useTheme } from '../context/ThemeContext';

// Validation Schemas
const passwordSchema = z.object({
  email: z.string()
    .min(1, "Email is required.")
    .email("Please enter a valid email address.")
    .max(100, "Maximum 100 characters allowed."),
  password: z.string()
    .min(6, "Password must contain at least 6 characters.")
    .max(72, "Maximum 72 characters allowed.")
});

const requestOtpSchema = z.object({
  email: z.string()
    .min(1, "Email is required.")
    .email("Please enter a valid email address.")
    .max(100, "Maximum 100 characters allowed.")
});

const Login = () => {
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' | 'otp'
  const [otpStep, setOtpStep] = useState('request'); // 'request' | 'verify'
  const [otpValue, setOtpValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);

  const { login, googleLogin, sendLoginOTP, verifyLoginOTP, setError, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Setup form based on login method
  const currentSchema = loginMethod === 'password' ? passwordSchema : requestOtpSchema;
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isDirty },
    trigger,
    getValues
  } = useForm({
    resolver: zodResolver(currentSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const emailValue = watch('email');
  const passwordValue = watch('password');

  // Handle timer
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handlePasswordLogin = async (data) => {
    const result = await login(data.email, data.password);
    if (result === true) {
      navigate('/dashboard');
    } else if (result && result.requiresVerification) {
      navigate('/verify-email', { state: { email: result.email } });
    }
  };

  const handleRequestOTP = async (data) => {
    if (resendAttempts >= 3) {
      setError("Maximum OTP request attempts reached. Please try again later.");
      return;
    }
    const success = await sendLoginOTP(data.email);
    if (success) {
      setOtpStep('verify');
      setResendTimer(60);
      setResendAttempts(prev => prev + 1);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    const success = await verifyLoginOTP(getValues('email'), otpValue);
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      setError('Google login failed: no credential returned by Google');
      return;
    }
    const success = await googleLogin(idToken);
    if (success) navigate('/dashboard');
  };

  const switchMethod = (method) => {
    clearError();
    setLoginMethod(method);
    setOtpStep('request');
    setOtpValue('');
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0f1115] text-slate-200' : 'bg-[#f7f9fc] text-slate-900'}`}>
      
      {/* Background aesthetics */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
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
        className="w-full max-w-[420px] bg-white dark:bg-[#16181d] p-6 sm:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800/60 relative z-10 my-4"
      >
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="SmartSplit Logo" className="h-14 sm:h-16 w-auto object-contain drop-shadow-md" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-1 sm:mb-2 tracking-tight">Login</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Choose login method</p>
        </div>

        {/* Segmented Control */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl mb-6 relative">
          <button
            type="button"
            onClick={() => switchMethod('password')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 z-10 ${loginMethod === 'password' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => switchMethod('otp')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 z-10 ${loginMethod === 'otp' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            OTP
          </button>
          {/* Animated Highlight */}
          <div 
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-lg shadow-sm transition-transform duration-300 ease-out z-0 border border-slate-200/50 dark:border-slate-600/50"
            style={{ transform: loginMethod === 'password' ? 'translateX(0)' : 'translateX(100%)' }}
          />
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

        <AnimatePresence mode="wait">
          {loginMethod === 'password' || (loginMethod === 'otp' && otpStep === 'request') ? (
            <motion.form 
              key="primary-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit(loginMethod === 'password' ? handlePasswordLogin : handleRequestOTP)} 
              className="space-y-4 sm:space-y-5"
            >
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

              {loginMethod === 'password' && (
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password<span className="text-red-500 ml-1">*</span></label>
                    <span className="text-[10px] text-slate-400">{passwordValue?.length || 0} / 72</span>
                  </div>
                  <div className="relative group">
                    <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.password ? 'text-red-400' : 'text-slate-400 group-focus-within:text-primary-500'}`} size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
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
                  
                  <div className="flex justify-between items-center mt-3">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-700 dark:bg-[#0f1115]" />
                      <span className="text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Remember me</span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!isValid || loading}
                className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-all duration-300 ${!isValid || loading ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-400 dark:text-primary-700 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/25 active:scale-[0.98]'}`}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>{loginMethod === 'password' ? 'Sign In' : 'Send OTP'} <ArrowRight size={16} /></>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="otp-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleVerifyOTP} 
              className="space-y-4 sm:space-y-5"
            >
              <div className="text-center mb-6">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  We sent a 6-digit code to <br/>
                  <span className="font-medium text-slate-900 dark:text-white">{emailValue}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-center">Enter OTP<span className="text-red-500 ml-1">*</span></label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[0.5em] text-2xl font-semibold py-3 bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700/80 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all outline-none"
                  placeholder="------"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={otpValue.length !== 6 || loading}
                className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-all duration-300 ${otpValue.length !== 6 || loading ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-400 dark:text-primary-700 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/25 active:scale-[0.98]'}`}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Verify & Login'}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  disabled={resendTimer > 0 || loading || resendAttempts >= 3}
                  onClick={handleSubmit(handleRequestOTP)}
                  className={`text-xs font-medium ${resendTimer > 0 || resendAttempts >= 3 ? 'text-slate-400 cursor-not-allowed' : 'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors'}`}
                >
                  {resendAttempts >= 3 ? 'Max attempts reached' : resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
                </button>
              </div>
              
              <div className="text-center mt-2">
                 <button
                  type="button"
                  onClick={() => setOtpStep('request')}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Change Email
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">OR</span>
          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google login failed')}
            theme={theme === 'dark' ? 'filled_black' : 'outline'}
            shape="rectangular"
            size="large"
            width={300}
            text="continue_with"
            use_fedcm_for_prompt={true}
          />
        </div>

        <p className="text-center mt-6 text-slate-600 dark:text-slate-400 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
            Create Account
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
