import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/global.css';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboard from './pages/AdminDashboard';
import AddCreatorPage from './pages/admin/AddCreatorPage';
import Layout from './components/Layout';

// Protected Route for creators
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

// Admin Route (only admin access)
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader">Loading...</div>;
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><Layout><AdminDashboard /></Layout></AdminRoute>} />
      <Route path="/admin/top-performers" element={<AdminRoute><Navigate to="/admin?tab=top-performers" replace /></AdminRoute>} />
      <Route path="/admin/creator/:creatorId" element={<AdminRoute><Layout><AdminDashboard /></Layout></AdminRoute>} />
      <Route path="/admin/add-creator" element={<AdminRoute><Layout><AddCreatorPage /></Layout></AdminRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}