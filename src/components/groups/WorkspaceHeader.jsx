import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Compass } from 'lucide-react';
import { motion } from 'framer-motion';

const WorkspaceHeader = ({ onCreateGroup }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
          Group Workspace
        </h1>
        <p className="text-sm md:text-base font-medium text-slate-500 dark:text-slate-400 max-w-2xl text-balance">
          Manage all expense groups, monitor budgets, collaborate with members, and track settlements across your entire workspace.
        </p>
      </motion.div>
      
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/temp-settlement?new=1')}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-[#16181d] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
        >
          <Compass size={17} className="text-emerald-600 dark:text-emerald-400" /> Temp Settlement
        </button>
        <button
          onClick={onCreateGroup}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-primary-500/30 active:scale-95"
        >
          <Plus size={18} strokeWidth={3} /> Create Group
        </button>
      </motion.div>
    </div>
  );
};

export default WorkspaceHeader;
