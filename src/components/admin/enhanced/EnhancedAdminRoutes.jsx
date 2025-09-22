import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import LazyLoader, { SkeletonLoader } from './Performance/LazyLoader';
import ProtectedRoute from './Security/ProtectedRoute';
import { PERMISSIONS } from '../../../services/AuthService';

// Lazy load all major components for better performance
const DashboardOverview = lazy(() => import('./Dashboard/DashboardOverview'));
const InventoryManagement = lazy(() => import('./Inventory/InventoryManagement'));
const SalesAnalytics = lazy(() => import('./Analytics/SalesAnalytics'));
const AdvancedReports = lazy(() => import('./Analytics/AdvancedReports'));
const SystemMonitoring = lazy(() => import('./System/SystemMonitoring'));
const SEOTools = lazy(() => import('./SEO/SEOTools'));
const CommunicationCenter = lazy(() => import('./Communication/CommunicationCenter'));
const RoleManager = lazy(() => import('./Security/RoleManager'));
const AuditLogs = lazy(() => import('./Security/AuditLogs'));
const SecurityDashboard = lazy(() => import('./Security/SecurityDashboard'));
const AdminMessagingDashboard = lazy(() => import('./Messaging/AdminMessagingDashboard'));

// Placeholder components for future implementation
const PlaceholderComponent = ({ title, description }) => (
  <div style={{
    padding: '40px',
    textAlign: 'center',
    background: 'var(--glass-bg)',
    borderRadius: '16px',
    border: '1px solid var(--glass-border)',
    margin: '20px'
  }}>
    <h2 style={{ color: 'var(--text-color)', marginBottom: '15px' }}>
      {title}
    </h2>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
      {description}
    </p>
    <div style={{
      padding: '20px',
      background: 'rgba(99, 102, 241, 0.1)',
      borderRadius: '8px',
      border: '1px solid rgba(99, 102, 241, 0.2)'
    }}>
      <i className="fas fa-tools" style={{ fontSize: '48px', color: 'var(--primary-color)', marginBottom: '15px' }}></i>
      <p style={{ color: 'var(--text-color)', margin: 0 }}>
        Bu bo'lim ishlab chiqilmoqda...
      </p>
    </div>
  </div>
);

const EnhancedAdminRoutes = ({ userRole = 'admin' }) => {
  return (
    <Routes>
      {/* Enhanced Dashboard Overview */}
      <Route 
        path="/" 
        element={
          <LazyLoader fallback={<SkeletonLoader type="card" count={4} />}>
            <DashboardOverview userRole={userRole} />
          </LazyLoader>
        } 
      />
      
      {/* Analytics Routes */}
      <Route 
        path="/analytics" 
        element={
          <LazyLoader fallback={<SkeletonLoader type="chart" count={2} />}>
            <AdvancedReports />
          </LazyLoader>
        } 
      />
      <Route 
        path="/analytics/sales" 
        element={
          <LazyLoader fallback={<SkeletonLoader type="chart" count={3} />}>
            <SalesAnalytics />
          </LazyLoader>
        } 
      />
      <Route 
        path="/analytics/revenue" 
        element={
          <LazyLoader fallback={<SkeletonLoader type="chart" count={2} />}>
            <AdvancedReports />
          </LazyLoader>
        } 
      />
      
      {/* Inventory Routes */}
      <Route 
        path="/inventory" 
        element={
          <LazyLoader fallback={<SkeletonLoader type="table" count={10} />}>
            <InventoryManagement />
          </LazyLoader>
        } 
      />
      
      {/* Communication Routes */}
      <Route 
        path="/communication" 
        element={
          <LazyLoader fallback={<SkeletonLoader type="card" count={3} />}>
            <CommunicationCenter />
          </LazyLoader>
        } 
      />
      
      {/* Messaging Routes */}
      <Route 
        path="/messaging" 
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.SEND_MESSAGES}>
            <LazyLoader fallback={<SkeletonLoader type="table" count={10} />}>
              <AdminMessagingDashboard />
            </LazyLoader>
          </ProtectedRoute>
        } 
      />
      
      {/* System Monitoring Routes */}
      <Route 
        path="/system" 
        element={
          <LazyLoader fallback={<SkeletonLoader type="card" count={6} />}>
            <SystemMonitoring />
          </LazyLoader>
        } 
      />
      
      {/* SEO Tools Routes */}
      <Route 
        path="/seo" 
        element={
          <LazyLoader fallback={<SkeletonLoader type="card" count={3} />}>
            <SEOTools />
          </LazyLoader>
        } 
      />
      
      {/* Security Routes */}
      <Route 
        path="/security" 
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_AUDIT_LOGS}>
            <LazyLoader fallback={<SkeletonLoader type="card" count={6} />}>
              <SecurityDashboard />
            </LazyLoader>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/security/roles" 
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_ROLES}>
            <LazyLoader fallback={<SkeletonLoader type="table" count={8} />}>
              <RoleManager />
            </LazyLoader>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/security/audit" 
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_AUDIT_LOGS}>
            <LazyLoader fallback={<SkeletonLoader type="table" count={15} />}>
              <AuditLogs />
            </LazyLoader>
          </ProtectedRoute>
        } 
      />
      
      {/* Settings Routes */}
      <Route 
        path="/settings" 
        element={
          <LazyLoader>
            <PlaceholderComponent 
              title="System Settings" 
              description="Admin panel sozlamalari va konfiguratsiya"
            />
          </LazyLoader>
        } 
      />
    </Routes>
  );
};

export default EnhancedAdminRoutes;