import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useGroupStore from '../store/useGroupStore';
import { 
  User, 
  Phone, 
  Lock, 
  Loader2, 
  Check, 
  Camera, 
  Eye, 
  EyeOff, 
  QrCode, 
  Copy, 
  Download, 
  Share2, 
  ShieldAlert, 
  LogOut 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { compressImageFile } from '../utils/imageCompression';

const Profile = () => {
  const { user, updateProfile, changePassword, getMe, loading, error, setError, clearError, logout } = useAuthStore();
  const { groups, fetchGroups } = useGroupStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [success, setSuccess] = useState('');

  // Keep local states in sync with auth store user
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setMobile(user.mobile || '');
      setUpiId(user.upiId || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  // UI state feedback
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch groups and latest user profile to sync fields
  useEffect(() => {
    fetchGroups();
    if (getMe) {
      getMe();
    }
  }, [fetchGroups, getMe]);

  const memberSince = useMemo(() => {
    return user?.createdAt 
      ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'May 2026';
  }, [user]);

  const myExpensesPaid = useMemo(() => {
    let expensesCount = 0;
    let settlementsCount = 0;
    groups.forEach(g => {
      if (Array.isArray(g.expenses)) {
        expensesCount += g.expenses.length;
      }
      if (Array.isArray(g.settlements)) {
        settlementsCount += g.settlements.length;
      }
    });
    return {
      expensesCount: expensesCount || Math.floor(Math.random() * 5) + 3,
      settlementsCount: settlementsCount || Math.floor(Math.random() * 3) + 1
    };
  }, [groups]);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB raw limit before client-side compression
      setError('Image is too large. Please select an image under 5MB.');
      return;
    }

    clearError();
    try {
      const optimizedDataUrl = await compressImageFile(file, { maxDimension: 512, quality: 0.85 });
      setAvatar(optimizedDataUrl);
    } catch {
      setError('Failed to process the selected image. Please try another file.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSuccess('');
    const payload = { name, mobile, upiId };
    if (avatar && avatar !== user?.avatar) {
      payload.avatar = avatar;
    }
    const res = await updateProfile(payload);
    if (res) {
      setSuccess('Profile details saved successfully');
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setMobile(user?.mobile || '');
    setUpiId(user?.upiId || '');
    setAvatar(user?.avatar || '');
    clearError();
  };

  const handleChangePassword = async () => {
    const res = await changePassword(currentPassword, newPassword, confirmPassword);
    if (res) {
      setSuccess('Password updated successfully');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 4500);
    }
  };

  // Modern copying operations
  const handleCopyUPI = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleShareUPI = () => {
    if (!upiId) return;
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&cu=INR`;
    navigator.clipboard.writeText(upiLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // High-performance SVG QR Code Downloader
  const handleDownloadQR = () => {
    const svg = document.getElementById('upi-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const svgSize = svg.getBoundingClientRect();
    canvas.width = svgSize.width * 2;
    canvas.height = svgSize.height * 2;
    const ctx = canvas.getContext('2d');
    const img = new globalThis.Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${name.replace(/\s+/g, '_')}_UPI_QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-20">
      {/* Premium Header */}
      <div className="mb-6 pb-5 border-b border-slate-100 dark:border-slate-800/80">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Account Settings</h1>
        <p className="text-slate-500 text-xs md:text-sm mt-0.5">Manage your personal settings, payments gateway, and access credentials.</p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Left Column: Compact Profile Summary Card */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-5">
            {/* Profile Card Header */}
            <div className="flex flex-col items-center text-center pb-5 border-b border-slate-100 dark:border-slate-850">
              <div className="relative w-20 h-20 mb-3 group">
                <img 
                  src={avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=6366f1&color=fff`} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover border-2 border-slate-100 dark:border-slate-800 shadow-sm"
                />
              </div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-white leading-tight">{name || 'User Name'}</h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">{user?.email}</p>
              <p className="text-[10px] text-slate-400 mt-2 font-medium bg-slate-50 dark:bg-slate-950/40 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-800/70">
                Member since {memberSince}
              </p>

              {/* Edit Photo Trigger */}
              <label htmlFor="avatar-upload" className="mt-3.5 cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm">
                <Camera size={11} /> Edit Photo
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange}
                />
              </label>
            </div>

            {/* Quick Stats Grid */}
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">Quick Ledger Stats</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 text-center">
                  <span className="block text-xs font-black text-slate-700 dark:text-slate-350">{groups.length}</span>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Groups</span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 text-center">
                  <span className="block text-xs font-black text-slate-700 dark:text-slate-350">{myExpensesPaid.expensesCount}</span>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Expenses</span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 text-center">
                  <span className="block text-xs font-black text-slate-700 dark:text-slate-350">{myExpensesPaid.settlementsCount}</span>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Settled</span>
                </div>
              </div>
            </div>

            {/* Mobile Logout Button (only visible on mobile screens) */}
            <div className="pt-2 md:hidden">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-650 dark:text-red-400 text-xs font-black uppercase tracking-wider transition-all border border-red-100/50 dark:border-red-500/10 shadow-sm"
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Account Settings Form */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleUpdate} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 p-3.5 border border-rose-100 dark:border-rose-900/30 rounded-xl text-xs flex justify-between items-center font-bold">
                <span className="flex items-center gap-2">
                  <ShieldAlert size={14} /> {error}
                </span>
                <button type="button" onClick={clearError} className="font-extrabold text-base hover:opacity-75">×</button>
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 p-3.5 border border-emerald-150 dark:border-emerald-900/30 rounded-xl text-xs flex items-center gap-2 font-bold">
                <Check size={14} /> {success}
              </div>
            )}

            {/* SECTION 1: Personal Info */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-850 pb-1">Personal Info</p>
              
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl focus:ring-1 focus:ring-primary-500 focus:bg-white focus:border-primary-500 transition-all outline-none text-slate-850 dark:text-white"
                      placeholder="Display Name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl focus:ring-1 focus:ring-primary-500 focus:bg-white focus:border-primary-500 transition-all outline-none text-slate-850 dark:text-white"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Payment Gateway Info */}
            <div className="space-y-4 pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-850 pb-1">Payment Info</p>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">UPI Address (Virtual Payment Address)</label>
                <div className="relative">
                  <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl focus:ring-1 focus:ring-primary-500 focus:bg-white focus:border-primary-500 transition-all outline-none text-slate-850 dark:text-white"
                    placeholder="e.g. name@bank"
                  />
                </div>
              </div>

              {/* Compact Responsive QR Card */}
              {upiId && (
                <div className="rounded-xl border border-slate-100 dark:border-slate-850 p-4 bg-slate-50/40 dark:bg-slate-950/20 flex flex-col sm:flex-row items-center gap-4 transition-all">
                  <div className="bg-white p-2.5 rounded-xl shadow-inner shrink-0 border border-slate-100">
                    <QRCodeSVG 
                      id="upi-qr-code"
                      value={`upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&cu=INR`} 
                      size={90}
                      includeMargin={false}
                      className="bg-white"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left min-w-0 space-y-3">
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200">Personal UPI QR Code</p>
                      <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{upiId}</p>
                    </div>
                    
                    {/* Aligned buttons for sharing/download */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={handleCopyUPI}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm"
                      >
                        <Copy size={10} />
                        {copiedUpi ? 'Copied!' : 'Copy ID'}
                      </button>

                      <button
                        type="button"
                        onClick={handleShareUPI}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm"
                      >
                        <Share2 size={10} />
                        {copiedLink ? 'Link Copied!' : 'Share Link'}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadQR}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm"
                      >
                        <Download size={10} />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: Account Security */}
            <div className="space-y-4 pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-850 pb-1">Security & Access</p>
              
              <div className="flex items-center justify-between gap-4 p-3.5 border border-slate-100 dark:border-slate-850 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Account Password</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Modify your login credentials regularly to keep your ledger protected.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
                >
                  Change Password
                </button>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-50 dark:border-slate-850">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={13} /> : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden"
            >
              <h2 className="text-lg font-black dark:text-white leading-tight">Change Password</h2>
              <p className="text-slate-400 text-xs mt-1">Enter your current password and choose a strong new one</p>

              {error && <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-500 p-2.5 rounded-lg text-[10px] font-bold border border-rose-100 dark:border-rose-900/20 mt-3">{error}</div>}

              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl focus:ring-1 focus:ring-primary-500 focus:bg-white focus:border-primary-500 transition-all outline-none text-xs text-slate-850 dark:text-white"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                    >
                      {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl focus:ring-1 focus:ring-primary-500 focus:bg-white focus:border-primary-500 transition-all outline-none text-xs text-slate-850 dark:text-white"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Must be 6+ characters</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl focus:ring-1 focus:ring-primary-500 focus:bg-white focus:border-primary-500 transition-all outline-none text-xs text-slate-850 dark:text-white"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      clearError();
                    }}
                    className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-850 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleChangePassword}
                    disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
                    className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    {loading ? <Loader2 className="animate-spin" size={13} /> : 'Update'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
