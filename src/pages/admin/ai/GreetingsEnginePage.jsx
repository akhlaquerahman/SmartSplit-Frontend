import React from 'react';
import { useRulesStore } from '../../../store/useRulesStore';
import { useDashboardStats } from '../../../hooks/rulesApi';
import GreetingsTable from '../../../components/admin/ai/GreetingsTable';
import FallbackTable from '../../../components/admin/ai/FallbackTable';
import RuleDrawer from '../../../components/admin/ai/RuleDrawer';
import AITestPanel from '../../../components/admin/ai/AITestPanel';
import { MessageSquare, ShieldAlert, Activity, TrendingUp, Play } from 'lucide-react';

const KPICard = ({ title, value, icon: Icon, trend }) => (
  <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 flex flex-col justify-between">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900 mt-1">{value || 0}</h3>
      </div>
      <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
        <Icon size={24} />
      </div>
    </div>

    <div className="flex items-center text-sm">
      <span className="text-green-400 font-medium">{trend}</span>
      <span className="text-gray-500 ml-2">vs last week</span>
    </div>
  </div>
);

const GreetingsEnginePage = () => {
  const { activeTab, setActiveTab, openTestPanel } = useRulesStore();
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Greetings & Fallback Engine</h1>
          <p className="text-gray-500 text-sm sm:text-base max-w-3xl">
            Manage welcome messages, fallback responses, escalation logic, multilingual greetings and AI confidence rules.
          </p>
        </div>
        <button 
          onClick={openTestPanel}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap self-start sm:self-auto"
        >
          <Play size={18} fill="currentColor" />
          Test Engine
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KPICard title="Total Greetings" value={stats?.totalGreetings} icon={MessageSquare} trend="+12%" />
        <KPICard title="Fallback Rules" value={stats?.totalFallbacks} icon={ShieldAlert} trend="+2%" />
        <KPICard title="Today's Triggers" value={stats?.todaysTriggerCount} icon={Activity} trend="+45%" />
        <KPICard title="Escalation Rules" value={stats?.escalationRules} icon={TrendingUp} trend="0%" />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Main Area */}
        <div className="w-full space-y-6">

          <div className="flex border-b border-gray-200">
            <button 
              className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'greetings' || activeTab === 'fastpath' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
              onClick={() => setActiveTab('fastpath')}
            >
              Fastpath/FAQs
              {(activeTab === 'greetings' || activeTab === 'fastpath') && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600" />}
            </button>
            <button 
              className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'analytics' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
              {activeTab === 'analytics' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600" />}
            </button>
          </div>


          <div className="min-h-[500px]">
            {(activeTab === 'greetings' || activeTab === 'fastpath') && <GreetingsTable />}
            {activeTab === 'analytics' && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-12 text-center text-gray-500">
                Detailed Analytics Dashboard Coming Soon. 
                <br/> <br/>
                Top Greeting: <span className="text-gray-900 font-medium">{stats?.topGreeting?.name || 'N/A'}</span>
                <br/>
                Top Fallback: <span className="text-gray-900 font-medium">{stats?.topFallback?.name || 'N/A'}</span>
              </div>
            )}

          </div>
        </div>
      </div>

      <RuleDrawer />
      <AITestPanel />
    </div>
  );
};

export default GreetingsEnginePage;

