import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Eye, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';

const ReportPreviewCard = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data } = await api.get('/groups');
        setGroups(data);
        if (data.length > 0) setSelectedGroup(data[0]._id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    if (!selectedGroup) return;
    const fetchReportStats = () => {
      const g = groups.find(x => x._id === selectedGroup);
      if (g) {
        setReportData({
          totalExpenses: `₹${(Math.random() * 5000 + 1000).toFixed(0)}`, // Just mock visual stats for the widget preview
          membersCount: g.members?.length || 0,
          date: new Date().toLocaleDateString()
        });
      }
    };
    fetchReportStats();
  }, [selectedGroup, groups]);

  if (loading) return <div className="p-5 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden w-full max-w-sm mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 opacity-80" />
          <h3 className="font-medium text-sm">Financial Report</h3>
        </div>
        
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="w-full text-xs p-2 border-none rounded bg-white/20 text-white placeholder-white focus:ring-1 focus:ring-white outline-none appearance-none backdrop-blur-sm cursor-pointer"
        >
          {groups.length === 0 ? (
            <option className="text-gray-800" value="">No groups found</option>
          ) : (
            groups.map(g => (
              <option key={g._id} value={g._id} className="text-gray-800">{g.name}</option>
            ))
          )}
        </select>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-gray-50">
          <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Total Expenses</div>
          <div className="font-semibold text-gray-800 text-sm">{reportData?.totalExpenses}</div>
        </div>
        
        <div className="flex justify-between items-center pb-3 border-b border-gray-50">
          <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Members Included</div>
          <div className="font-medium text-gray-700 text-sm">{reportData?.membersCount}</div>
        </div>

        <div className="flex justify-between items-center pb-3 border-b border-gray-50">
          <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Generated On</div>
          <div className="font-medium text-gray-700 text-sm">{reportData?.date}</div>
        </div>

        <div className="flex gap-2 pt-2">
          <button 
            onClick={() => navigate(`/group/${selectedGroup}`)}
            className="flex-1 flex justify-center items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 rounded-lg text-xs font-medium transition-colors"
          >
            <Eye className="w-4 h-4" /> View
          </button>
          <button 
            onClick={() => navigate(`/group/${selectedGroup}`)}
            className="flex-1 flex justify-center items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 p-2 rounded-lg text-xs font-medium transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPreviewCard;
