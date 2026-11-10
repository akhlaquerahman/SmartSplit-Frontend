import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import Login from '../pages/Login';
import Register from '../pages/Register';
import VerifyEmail from '../pages/VerifyEmail';
import ForgotPassword from '../pages/ForgotPassword';
import VerifyForgotPassword from '../pages/VerifyForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Dashboard from '../pages/Dashboard';
import Groups from '../pages/Groups';
import Reports from '../pages/Reports';
import GroupDetails from '../pages/GroupDetails';
import Profile from '../pages/Profile';
import Friends from '../pages/Friends';
import TempSettlement from '../pages/TempSettlement';
import MainLayout from '../layouts/MainLayout';

// Admin imports
import AdminLayout from '../admin/components/AdminLayout';
import AdminDashboard from '../admin/pages/Dashboard';
import AdminUsers from '../admin/pages/Users';
import AdminGroups from '../admin/pages/Groups';
import AdminGroupDetails from '../admin/pages/GroupDetails';
import AdminExpenses from '../admin/pages/Expenses';
import AdminSettlements from '../admin/pages/Settlements';
import AdminLogs from '../admin/pages/Logs';
import AdminReport from '../admin/pages/AdminReport';
import DatabaseExplorer from '../admin/pages/DatabaseExplorer';

// AI Studio Imports
import AIStudioLayout from '../admin/ai/layout/AIStudioLayout';
import AIDashboard from '../admin/ai/pages/AIDashboard';
import Conversations from '../admin/ai/pages/Conversations';
import KnowledgeBase from '../admin/ai/pages/KnowledgeBase';

import AICacheManager from '../pages/admin/ai/AICacheManager';
import GreetingsEnginePage from '../pages/admin/ai/GreetingsEnginePage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <MainLayout>{children}</MainLayout>;
};

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <AdminLayout>{children}</AdminLayout>;
};

const AppOwnerProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin' || !user?.isAppOwner) return <Navigate to="/admin/dashboard" replace />;
  return <AdminLayout>{children}</AdminLayout>;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/verify-forgot-password" element={<PublicRoute><VerifyForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/temp-settlement" element={<ProtectedRoute><TempSettlement /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/group/:id" element={<ProtectedRoute><GroupDetails /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
      <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
      <Route path="/admin/groups" element={<AdminProtectedRoute><AdminGroups /></AdminProtectedRoute>} />
      <Route path="/admin/groups/:id" element={<AdminProtectedRoute><AdminGroupDetails /></AdminProtectedRoute>} />
      <Route path="/admin/expenses" element={<AdminProtectedRoute><AdminExpenses /></AdminProtectedRoute>} />
      <Route path="/admin/settlements" element={<AdminProtectedRoute><AdminSettlements /></AdminProtectedRoute>} />
      <Route path="/admin/logs" element={<AdminProtectedRoute><AdminLogs /></AdminProtectedRoute>} />
      <Route path="/admin/reports" element={<AdminProtectedRoute><AdminReport /></AdminProtectedRoute>} />
      <Route path="/admin/database-explorer" element={<AppOwnerProtectedRoute><DatabaseExplorer /></AppOwnerProtectedRoute>} />
      
      {/* AI Studio Routes */}
      <Route path="/admin/ai-studio" element={<AppOwnerProtectedRoute><AIStudioLayout /></AppOwnerProtectedRoute>}>
        <Route index element={<AIDashboard />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="knowledge" element={<KnowledgeBase />} />

        <Route path="greetings-fallback" element={<GreetingsEnginePage />} />
        <Route path="cache-manager" element={<AICacheManager />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
