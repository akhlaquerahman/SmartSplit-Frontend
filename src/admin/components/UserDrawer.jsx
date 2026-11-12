import React, { useState } from 'react';
import {
  X, Mail, Phone, Calendar, Edit2, CheckCircle2, Shield, AlertTriangle, Wallet,
  Save, Camera, RotateCcw, KeyRound, Clock, Monitor, Receipt, FolderKanban, Handshake, BadgeCheck
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { compressImageFile } from '../../utils/imageCompression';

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const formatDateTime = (value) => {
  if (!value) return 'Never';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDevice = (login) => {
  if (!login) return 'No login telemetry';
  const parts = [login.deviceInfo?.browser, login.deviceInfo?.os].filter(Boolean);
  if (parts.length && login.ipAddress) return `${parts.join(' · ')} (${login.ipAddress})`;
  if (parts.length) return parts.join(' · ');
  return login.ipAddress || 'Web session';
};

const UserDrawer = ({ user, userDetails, loadingDetails, isOpen, onClose, onSave, onBlock, isSaving }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  
  // Edit State
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    mobile: '',
    role: 'user',
    status: 'active',
    upiId: '',
    avatar: '',
  });

  const isCreateMode = !user;

  const getInitialForm = (targetUser) => ({
    name: targetUser?.name || '',
    email: targetUser?.email || '',
    mobile: targetUser?.mobile || targetUser?.mobileNumber || '',
    role: targetUser?.role || 'user',
    status: targetUser?.status || (targetUser?.isBlocked ? 'suspended' : 'active'),
    upiId: targetUser?.upiId || '',
    avatar: targetUser?.avatar || targetUser?.profilePicture || '',
  });

  React.useEffect(() => {
    if (isOpen) {
      setAvatarError('');
      if (isCreateMode) {
        setIsEditing(true);
        setEditForm(getInitialForm(null));
      } else {
        setIsEditing(false);
        setEditForm(getInitialForm(user));
      }
    }
  }, [isOpen, user, isCreateMode]);

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image is too large. Please select an image under 5MB.');
      return;
    }

    setAvatarError('');
    try {
      const optimizedDataUrl = await compressImageFile(file, { maxDimension: 512, quality: 0.85 });
      setEditForm((prev) => ({ ...prev, avatar: optimizedDataUrl }));
    } catch {
      setAvatarError('Failed to process the selected image. Please try another file.');
    }
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      setEditForm(getInitialForm(user));
      setAvatarError('');
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    const originalAvatar = user?.avatar || user?.profilePicture || '';
    const payload = { ...editForm };
    if (payload.avatar === originalAvatar) {
      delete payload.avatar;
    }

    const result = await onSave(isCreateMode ? 'new' : user._id, payload);
    if (!isCreateMode && result !== false) {
      setIsEditing(false);
    }
  };

  if (!isOpen) return null;

  const displayUser = userDetails?.user ? { ...user, ...userDetails.user } : user;
  const activity = userDetails?.activity || displayUser?.activity || {};
  const lastLogin = userDetails?.lastLogin || displayUser?.lastLogin || null;
  const recentGroups = userDetails?.recentGroups || [];
  const recentExpenses = userDetails?.recentExpenses || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <Motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-0"
        />
        
        {/* Drawer Panel */}
        <Motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md h-full bg-white dark:bg-[#16181d] border-l border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{isCreateMode ? 'Create New User' : 'User Details'}</h2>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* User Hero Section */}
          {!isCreateMode && (
          <div className="p-6 pb-0 flex flex-col items-center">
            <div className="relative group">
              <img 
                src={(isEditing ? editForm.avatar : user.avatar) || user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent((isEditing ? editForm.name : user.name) || 'User')}&background=random`} 
                alt={user.name} 
                className="w-24 h-24 rounded-full border-4 border-white dark:border-[#16181d] shadow-lg object-cover"
              />
              {isEditing ? (
                <label
                  htmlFor="admin-user-avatar-upload"
                  title="Change profile photo"
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white border-2 border-white dark:border-[#16181d] flex items-center justify-center cursor-pointer shadow-md transition-colors"
                >
                  <Camera size={14} />
                </label>
              ) : (
                <div
                  title={displayUser.isOnline ? 'Online now' : 'Offline'}
                  className={cn(
                    "absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white dark:border-[#16181d]",
                    displayUser.isOnline ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                  )}
                />
              )}
            </div>

            {isEditing && (
              <div className="mt-3 flex items-center gap-2">
                <label
                  htmlFor="admin-user-avatar-upload"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition-colors"
                >
                  <Camera size={12} /> Change Photo
                </label>
                {editForm.avatar !== (user?.avatar || user?.profilePicture || '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm((prev) => ({ ...prev, avatar: user?.avatar || user?.profilePicture || '' }));
                      setAvatarError('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition-colors"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                )}
              </div>
            )}
            
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-4">{user.name}</h3>
            <p className="text-sm font-medium text-slate-500">{user.email}</p>
            
            <div className="flex items-center gap-2 mt-4">
              <span className={cn(
                "px-3 py-1 text-xs font-bold rounded-full uppercase tracking-widest",
                user.role === 'admin' 
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400" 
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
              )}>
                {user.role}
              </span>
              <span className={cn(
                "px-3 py-1 text-xs font-bold rounded-full uppercase tracking-widest",
                user.isBlocked 
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" 
                  : user.isVerified 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
              )}>
                {user.isBlocked ? 'Suspended' : user.isVerified ? 'Verified' : 'Pending'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 w-full mt-6 pb-6 border-b border-slate-100 dark:border-slate-800/60">
              <button 
                onClick={handleToggleEdit}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2",
                  isEditing 
                    ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" 
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                )}
              >
                <Edit2 size={14} /> {isEditing ? 'Cancel Editing' : 'Edit Profile'}
              </button>
              <button 
                onClick={() => onBlock(user._id, user.isBlocked)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2",
                  user.isBlocked 
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20" 
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                )}
              >
                {user.isBlocked ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} 
                {user.isBlocked ? 'Restore Access' : 'Suspend Account'}
              </button>
            </div>
          </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {!isEditing && displayUser ? (
              <div className="space-y-6">
                {/* Contact & Identity Info */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Contact & Identity</h4>
                  <div className="space-y-3.5 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 shadow-sm"><Mail size={14} /></div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{displayUser.email}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0",
                        displayUser.isVerified
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                      )}>
                        {displayUser.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 shadow-sm"><Phone size={14} /></div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{displayUser.mobile || displayUser.mobileNumber || 'Not provided'}</p>
                        </div>
                      </div>
                      {displayUser.isMobileVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 shrink-0">
                          <BadgeCheck size={11} /> Verified
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 shadow-sm"><KeyRound size={14} /></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Authentication</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {displayUser.authProvider === 'google' || displayUser.googleId ? 'Google OAuth' : 'Email & Password'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 shadow-sm"><Calendar size={14} /></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Joined</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {displayUser.createdAt
                            ? new Date(displayUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                            : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-bold uppercase">Account ID</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300">{displayUser._id}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Info */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Financial Summary</h4>
                  <div className="space-y-3.5 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 shadow-sm"><Wallet size={14} /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">UPI ID</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{displayUser.upiId || 'Not connected'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Paid</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          {loadingDetails && activity.totalSpent === undefined ? '…' : formatCurrency(activity.totalSpent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Share</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          {loadingDetails && activity.totalShare === undefined ? '…' : formatCurrency(activity.totalShare)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Settled</p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {loadingDetails && activity.settledVolume === undefined ? '…' : formatCurrency(activity.settledVolume)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platform Activity (Real Aggregated Counts) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Activity</h4>
                    {loadingDetails && (
                      <span className="text-[10px] font-semibold text-blue-500 animate-pulse">Syncing…</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-center">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {loadingDetails && activity.totalGroups === undefined ? '—' : (activity.totalGroups ?? 0)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Total Groups</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-center">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {loadingDetails && activity.totalExpenses === undefined ? '—' : (activity.totalExpenses ?? 0)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                        Expenses ({activity.expensesPaidCount ?? 0} paid)
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-center">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {loadingDetails && activity.totalSettlements === undefined ? '—' : (activity.totalSettlements ?? 0)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                        Settlements ({activity.completedSettlements ?? 0} done)
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-center">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {loadingDetails && activity.loginCount === undefined ? '—' : (activity.loginCount ?? 0)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Recorded Logins</p>
                    </div>
                  </div>
                </div>

                {/* Session & Security */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Session & Security</h4>
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 shadow-sm"><Clock size={14} /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Presence / Last Login</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {displayUser.isOnline
                            ? 'Online now'
                            : lastLogin?.timestamp
                              ? formatDateTime(lastLogin.timestamp)
                              : 'No login record'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 shadow-sm"><Monitor size={14} /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Last Device & IP</p>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                          {formatDevice(lastLogin)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Groups */}
                {recentGroups.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <FolderKanban size={12} /> Recent Groups
                    </h4>
                    <div className="space-y-2">
                      {recentGroups.map((g) => (
                        <div key={g._id} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{g.name}</p>
                            <p className="text-[10px] text-slate-400">{g.category} · {g.memberCount} members</p>
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 shrink-0">
                            {new Date(g.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Expenses */}
                {recentExpenses.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Receipt size={12} /> Recent Expenses
                    </h4>
                    <div className="space-y-2">
                      {recentExpenses.map((e) => (
                        <div key={e._id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{e.description}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {e.groupName} · {e.isPayer ? 'Paid by user' : `Paid by ${e.paidByName}`}
                            </p>
                          </div>
                          <span className="text-xs font-black text-slate-900 dark:text-white shrink-0">
                            {formatCurrency(e.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!loadingDetails && recentGroups.length === 0 && recentExpenses.length === 0 && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                    <Handshake size={14} className="shrink-0" />
                    No group or expense activity recorded for this account yet.
                  </div>
                )}
              </div>
            ) : (
              /* Edit Form */
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <input
                  id="admin-user-avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/20 mb-6 flex items-start gap-3">
                  <Shield size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                    You are editing this user's core profile. Changes made here will take effect immediately across the platform.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Profile Photo</label>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <img
                      src={editForm.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(editForm.name || 'User')}&background=random`}
                      alt={editForm.name || 'User'}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                        {editForm.avatar?.startsWith('data:image') ? 'New photo selected (ready to save)' : 'Upload a new profile picture'}
                      </p>
                      <p className="text-[11px] text-slate-400">PNG, JPG or WEBP up to 5MB</p>
                    </div>
                    <label
                      htmlFor="admin-user-avatar-upload"
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 transition-colors"
                    >
                      <Camera size={13} /> Upload
                    </label>
                  </div>
                  {avatarError && (
                    <p className="mt-1.5 ml-1 text-xs font-semibold text-rose-600 dark:text-rose-400">{avatarError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                  <input
                    type="text"
                    name="mobile"
                    value={editForm.mobile}
                    onChange={handleEditChange}
                    placeholder="+1 234 567 890"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">UPI ID</label>
                  <input
                    type="text"
                    name="upiId"
                    value={editForm.upiId}
                    onChange={handleEditChange}
                    placeholder="username@bank"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Role</label>
                    <select
                      name="role"
                      value={editForm.role}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                    <select
                      name="status"
                      value={editForm.status}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions (Only when editing) */}
          {isEditing && (
            <div className="p-6 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#16181d]">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {isSaving ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> {isCreateMode ? 'Create User' : 'Save Changes'}</>
                )}
              </button>
            </div>
          )}
        </Motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserDrawer;
