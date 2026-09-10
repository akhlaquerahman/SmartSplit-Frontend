import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import SettlementsKPIs from '../components/SettlementsKPIs';
import SettlementsToolbar from '../components/SettlementsToolbar';
import SettlementsAnalytics from '../components/SettlementsAnalytics';
import SettlementsTable from '../components/SettlementsTable';
import SettlementDrawer from '../components/SettlementDrawer';
import { RefreshCw } from 'lucide-react';

const Settlements = () => {
  const [settlements, setSettlements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Selection
  const [selectedSettlements, setSelectedSettlements] = useState([]);
  
  // Drawer
  const [drawerSettlement, setDrawerSettlement] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [status, setStatus] = useState('all');
  const [groupId, setGroupId] = useState('all');
  const [groups, setGroups] = useState([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchSettlements();
  }, [search, paymentMethod, status, groupId, page, limit]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/admin/groups?limit=100');
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit,
        search,
        ...(status !== 'all' && { status }),
        ...(groupId !== 'all' && { groupId }),
        ...(paymentMethod !== 'all' && { paymentMethod })
      });

      const response = await api.get(`/admin/settlements?${params}`);
      
      setSettlements(response.data.settlements || []);
      setStats(response.data.stats || null);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      console.error('Error fetching settlements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setPaymentMethod('all');
    setStatus('all');
    setGroupId('all');
    setPage(1);
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedSettlements.length} selected settlements?`)) {
      // In a real app, call API here
      setSettlements(settlements.filter(s => !selectedSettlements.includes(s._id)));
      setSelectedSettlements([]);
    }
  };

  const handleRowClick = (settlement) => {
    setDrawerSettlement(settlement);
    setIsDrawerOpen(true);
  };

  const handleForceComplete = async (settlementId, reason = '') => {
    try {
      await api.patch(`/admin/settlements/${settlementId}/force-complete`, {
        ownerCompletionReason: reason
      });
      setIsDrawerOpen(false);
      fetchSettlements();
    } catch (error) {
      console.error('Error force completing settlement:', error);
      alert(error.response?.data?.message || 'Failed to force complete settlement');
    }
  };

  const handleReject = async (settlementId, reason = '') => {
    try {
      await api.patch(`/admin/settlements/${settlementId}/reject`, {
        rejectionReason: reason
      });
      setIsDrawerOpen(false);
      fetchSettlements();
    } catch (error) {
      console.error('Error rejecting settlement:', error);
      alert(error.response?.data?.message || 'Failed to reject settlement');
    }
  };

  const handleFlag = async (settlementId, currentFlaggedState) => {
    try {
      await api.patch(`/admin/settlements/${settlementId}/flag`, {
        flagged: !currentFlaggedState,
        reason: currentFlaggedState ? 'Unflagged by admin' : 'Flagged by admin'
      });
      fetchSettlements();
    } catch (error) {
      console.error('Error flagging settlement:', error);
      alert(error.response?.data?.message || 'Failed to flag/unflag settlement');
    }
  };

  const handleDelete = async (settlementId) => {
    if (!window.confirm('Are you sure you want to delete this settlement record?')) return;
    try {
      await api.delete(`/admin/settlements/${settlementId}`);
      if (drawerSettlement?._id === settlementId) setIsDrawerOpen(false);
      fetchSettlements();
    } catch (error) {
      console.error('Error deleting settlement:', error);
      alert(error.response?.data?.message || 'Failed to delete settlement');
    }
  };

  return (
    <div className="space-y-2 animate-in fade-in duration-500 pb-20">
      
      {/* Moved Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 mt-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Payment Operations</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Monitor settlements, reconcile payments, and resolve disputes</p>
        </div>
      </div>

      <SettlementsKPIs stats={stats} />
      
      <SettlementsAnalytics stats={stats} />

      <SettlementsToolbar 
        search={search}
        setSearch={setSearch}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        status={status}
        setStatus={setStatus}
        groupId={groupId}
        setGroupId={setGroupId}
        groups={groups}
        onClear={handleClearFilters}
        onDeleteSelected={handleDeleteSelected}
        hasSelected={selectedSettlements.length > 0}
      />

      {loading && settlements.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 bg-white dark:bg-[#16181d] rounded-[2rem] border border-slate-200 dark:border-slate-800/60 shadow-sm">
          <RefreshCw className="animate-spin text-blue-600" size={30} />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Payment Data...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          <SettlementsTable 
            settlements={settlements}
            selectedSettlements={selectedSettlements}
            setSelectedSettlements={setSelectedSettlements}
            onRowClick={handleRowClick}
            onForceComplete={handleForceComplete}
            onReject={handleReject}
            onFlag={handleFlag}
            onDelete={handleDelete}
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500">
                  Showing Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Rows per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                    className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-xs font-bold py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white dark:bg-[#16181d] border border-slate-200 dark:border-slate-800/60 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white dark:bg-[#16181d] border border-slate-200 dark:border-slate-800/60 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-out Drawer */}
      <SettlementDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        settlement={drawerSettlement}
        onForceComplete={handleForceComplete}
        onReject={handleReject}
      />

    </div>
  );
};

export default Settlements;