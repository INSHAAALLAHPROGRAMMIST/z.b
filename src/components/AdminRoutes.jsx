import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import AdminDashboard from './AdminDashboard';
import AdminBookManagement from './AdminBookManagement';
import AdminAuthorManagement from './AdminAuthorManagement';
import AdminGenreManagement from './AdminGenreManagement';
import AdminOrderManagement from './AdminOrderManagement';
import AdminUserManagement from './AdminUserManagement';
import AdminSettings from './AdminSettings';

function AdminRoutes() {
    return (
        <Routes>
            <Route path="/" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="books" element={<AdminBookManagement />} />
                <Route path="authors" element={<AdminAuthorManagement />} />
                <Route path="genres" element={<AdminGenreManagement />} />
                <Route path="orders" element={<AdminOrderManagement />} />
                <Route path="users" element={<AdminUserManagement />} />
                <Route path="settings" element={<AdminSettings />} />
            </Route>
        </Routes>
    );
}

export default AdminRoutes;