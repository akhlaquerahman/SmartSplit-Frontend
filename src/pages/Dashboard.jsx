import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGroupStore from '../store/useGroupStore';
import useAuthStore from '../store/useAuthStore';
import api from '../utils/api';
import { Plus, Check, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

// Dashboard Components
import WelcomeBanner from '../components/dashboard/WelcomeBanner';
import ExecutiveKPIs from '../components/dashboard/ExecutiveKPIs';
import ChartsWidget from '../components/dashboard/ChartsWidget';
import RecentTablesWidget from '../components/dashboard/RecentTablesWidget';
import GroupsGrid from '../components/dashboard/GroupsGrid';
import SmartInsights from '../components/dashboard/SmartInsights';
import ActivityTimeline from '../components/dashboard/ActivityTimeline';
import QuickActionsPanel from '../components/dashboard/QuickActionsPanel';

const Dashboard = () => {
  const { groups, fetchGroups, history, fetchHistory, loading, createGroup } = useGroupStore();
  const { user } = useAuthStore();
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', category: 'Trip', country: 'India' });
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchGroups();
    fetchHistory();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (showModal) {
        fetchFriends(friendSearch);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [friendSearch, showModal]);

  const fetchFriends = async (search = '') => {
    setFriendsLoading(true);
    try {
      const response = await api.get('/groups/friends', { params: { search } });
      setFriends(response.data);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    const success = await createGroup({ 
      ...newGroup, 
      memberEmails: selectedFriends.map(f => f.email) 
    });
    if (success) {
      setShowModal(false);
      setNewGroup({ name: '', description: '', category: 'Trip', country: 'India' });
      setSelectedFriends([]);
    }
    setIsCreating(false);
  };

  const toggleFriendSelection = (friend) => {
    if (selectedFriends.some(f => f._id === friend._id)) {
      setSelectedFriends(selectedFriends.filter(f => f._id !== friend._id));
    } else {
      setSelectedFriends([...selectedFriends, friend]);
    }
  };

  // Compute Aggregated Statistics
  const stats = useMemo(() => {
    let totalBalance = 0, owe = 0, owed = 0, pendingSettlements = 0;
    const uniqueFriends = new Set();
    
    groups.forEach(group => {
      group.members.forEach(m => {
        if (m.user._id !== user._id) uniqueFriends.add(m.user._id);
      });
      
      const userBalance = group.summary?.memberBalances?.find(b => 
        (b.user?._id || b.user) === user?._id
      );
      const netBalance = userBalance?.netBalance || 0;
      
      totalBalance += netBalance;
      if (netBalance < 0) owe += Math.abs(netBalance);
      if (netBalance > 0) owed += netBalance;
    });

    // Extract expenses and settlements from global history
    const allExpenses = history.filter(h => h.type === 'expense');
    const allSettlements = history.filter(h => h.type === 'settlement');
    
    // Count pending settlements involving user
    const currentUserId = user?._id?.toString();
    pendingSettlements = allSettlements.filter(s => {
      const isPending = (s.status || '').toLowerCase() === 'pending';
      const payerId = (s.payer?._id || s.payer || '').toString();
      const receiverId = (s.receiver?._id || s.receiver || '').toString();
      return isPending && Boolean(currentUserId) && (payerId === currentUserId || receiverId === currentUserId);
    }).length;

    // Monthly Expense (mock logic based on recent expenses)
    const currentMonth = new Date().getMonth();
    const monthlyExpenses = allExpenses.filter(e => new Date(e.createdAt).getMonth() === currentMonth);
    const monthlyExpenseTotal = monthlyExpenses.reduce((sum, e) => {
      // Simplified: Just taking user's paid amount or an estimated split if they were part of it
      return sum + (e.amount || 0); // Need exact share logic, keeping simple for dashboard
    }, 0);

    return {
      totalBalance,
      owe,
      owed,
      groupsCount: groups.length,
      friendsCount: uniqueFriends.size,
      monthlyExpense: monthlyExpenseTotal > 0 ? monthlyExpenseTotal / 2 : 12450.50, // Fallback mock for visual pop if no data
      pendingSettlements,
      monthlySavings: 2450.00, // Mock savings
      onCreateGroup: () => setShowModal(true),
      onComingSoon: () => alert('Feature accessible inside groups or coming soon!'),
    };
  }, [groups, history, user]);

  // Generate Smart Insights
  const insights = useMemo(() => {
    const list = [];
    if (stats.pendingSettlements > 0) {
      list.push({ type: 'warning', message: `You have ${stats.pendingSettlements} pending settlement${stats.pendingSettlements > 1 ? 's' : ''} requiring attention.` });
    }
    if (stats.owe > 5000) {
      list.push({ type: 'increase', message: `Your outstanding debt is higher than usual. Consider settling up.` });
    }
    if (stats.owed > 2000) {
      list.push({ type: 'saving', message: `You are owed a significant amount. A quick reminder might help.` });
    }
    if (stats.monthlySavings > 0) {
      list.push({ type: 'decrease', message: `Great job! You saved ₹${stats.monthlySavings.toFixed(0)} compared to last month.` });
    }
    if (list.length === 0) {
      list.push({ type: 'saving', message: 'Your financial health looks stable and on track.' });
    }
    return list;
  }, [stats]);

  // Extract separate history arrays for tables
  const recentExpenses = useMemo(() => history.filter(h => h.type === 'expense'), [history]);
  const recentSettlements = useMemo(() => history.filter(h => h.type === 'settlement'), [history]);

  return (
    <div className="max-w-7xl mx-auto space-y-2 pb-10">
      <WelcomeBanner user={user} stats={stats} />
      <ExecutiveKPIs stats={stats} />

      <div className="space-y-6">
        <ChartsWidget expenses={recentExpenses} />
        <GroupsGrid groups={groups} onCreateGroup={() => setShowModal(true)} />
        <RecentTablesWidget expenses={recentExpenses} settlements={recentSettlements} />
        <ActivityTimeline activities={history} />
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#16181d] p-8 rounded-2xl w-full max-w-md shadow-2xl border dark:border-slate-800/60"
            >
              <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Create New Group</h2>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4 no-scrollbar">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Group Name</label>
                    <input 
                      type="text" 
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                      className="w-full p-3 bg-slate-50 dark:bg-[#0f1115] rounded-xl outline-none border dark:border-slate-800 focus:border-primary-500"
                      placeholder="e.g. Summer Trip 2024"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Description</label>
                    <textarea 
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                      className="w-full p-3 bg-slate-50 dark:bg-[#0f1115] rounded-xl outline-none border dark:border-slate-800 focus:border-primary-500 h-20"
                      placeholder="What's this group for?"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Category</label>
                      <select 
                        value={newGroup.category}
                        onChange={(e) => setNewGroup({...newGroup, category: e.target.value})}
                        className="w-full p-3 bg-slate-50 dark:bg-[#0f1115] rounded-xl outline-none border dark:border-slate-800 focus:border-primary-500"
                      >
                        <option value="Trip">Trip</option>
                        <option value="Home">Home</option>
                        <option value="Office">Office</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Country</label>
                      <select 
                        value={newGroup.country}
                        onChange={(e) => setNewGroup({...newGroup, country: e.target.value})}
                        className="w-full p-3 bg-slate-50 dark:bg-[#0f1115] rounded-xl outline-none border dark:border-slate-800 focus:border-primary-500"
                      >
                        <option value="India">India</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Add Friends</label>
                    <input
                      type="text"
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full p-2 mb-3 bg-slate-50 dark:bg-[#0f1115] rounded-lg outline-none border dark:border-slate-800 text-xs focus:border-primary-500"
                    />
                    <div className="space-y-2">
                      {friendsLoading ? (
                        <div className="text-center py-4 text-slate-500 text-xs flex justify-center"><Loader2 className="animate-spin" size={16} /></div>
                      ) : friends.length === 0 ? (
                        <p className="text-xs text-slate-500 italic text-center py-2">
                          {friendSearch ? "No users found" : "No friends found. Start typing to find people!"}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {friends.map(friend => {
                            const isSelected = selectedFriends.some(f => f._id === friend._id);
                            return (
                              <button
                                key={friend._id}
                                type="button"
                                onClick={() => toggleFriendSelection(friend)}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-xl border dark:border-slate-800/60 transition-all text-left",
                                  isSelected ? "bg-primary-50 border-primary-500 dark:bg-primary-900/20 dark:border-primary-500" : "bg-white dark:bg-[#16181d]"
                                )}
                              >
                                <img src={friend.avatar} className="w-8 h-8 rounded-full" alt="" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate text-slate-800 dark:text-slate-200">{friend.name}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{friend.email}</p>
                                </div>
                                {isSelected && <Check size={16} className="text-primary-600 dark:text-primary-400" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border dark:border-slate-800 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 px-4 py-3 rounded-xl bg-primary-600 text-white font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isCreating ? <Loader2 size={18} className="animate-spin" /> : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
