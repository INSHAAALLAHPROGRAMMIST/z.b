import React, { useState, useEffect } from 'react';
import RealTimeStats from './RealTimeStats';
import QuickActions from './QuickActions';
import RecentActivity from './RecentActivity';
import SalesAnalytics from '../Analytics/SalesAnalytics';
import '../../../styles/admin/enhanced-dashboard.css';

const DashboardOverview = ({ userRole = 'admin' }) => {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date()
  });
  const [refreshInterval] = useState(30000); // 30 seconds

  return (
    <div className="enhanced-dashboard-overview">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="dashboard-controls">
          <div className="date-range-selector">
            <select 
              value="7d" 
              onChange={(e) => {
                const days = parseInt(e.target.value);
                setDateRange({
                  start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
                  end: new Date()
                });
              }}
            >
              <option value="1">Bugun</option>
              <option value="7">So'nggi 7 kun</option>
              <option value="30">So'nggi 30 kun</option>
              <option value="90">So'nggi 3 oy</option>
            </select>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <RealTimeStats 
            dateRange={dateRange}
            refreshInterval={refreshInterval}
            userRole={userRole}
          />
        </div>

        <div className="dashboard-section">
          <QuickActions userRole={userRole} />
        </div>

        <div className="dashboard-section">
          <SalesAnalytics 
            dateRange={dateRange}
          />
        </div>

        <div className="dashboard-section">
          <RecentActivity 
            dateRange={dateRange}
            userRole={userRole}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;