import React from 'react';
import OEEGauge from './OEEGauge';

const DashboardStats = ({ metrics, oee, onRefresh, isLoading }) => {
  return (
    <div className="dashboard-stats-container">
      {/* Quick Stats Section */}
      <div className="quick-stats">
        <div className="stats-header">
          <div className="stats-title">Quick Stats</div>
          <div className="stats-refresh" onClick={onRefresh}>
            <i className="fas fa-sync-alt"></i>
            <span>Refresh</span>
          </div>
        </div>
        <div className="stats-grid">
          {/* Power Card */}
          <div className="stat-card power">
            <div className="stat-label">
              <i className="fas fa-bolt"></i>
              <span>Total Power</span>
            </div>
            <div className="stat-value">{metrics.totalPower}</div>
            <div className="stat-unit">kW</div>
            <div className="stat-change">
              <span>Real-time data</span>
            </div>
          </div>
          
          {/* Current Card */}
          <div className="stat-card current">
            <div className="stat-label">
              <i className="fas fa-tachometer-alt"></i>
              <span>Current Draw</span>
            </div>
            <div className="stat-value">{metrics.totalCurrent}</div>
            <div className="stat-unit">A</div>
            <div className="stat-change">
              <span>Real-time data</span>
            </div>
          </div>
          
          {/* Active Cranes Card */}
          <div className="stat-card active">
            <div className="stat-label">
              <i className="fas fa-cogs"></i>
              <span>Active Cranes</span>
            </div>
            <div className="stat-value">{metrics.activeCranes}</div>
            <div className="stat-unit">/1 total</div>
            <div className="stat-change">
              <span>Based on 5-min activity</span>
            </div>
          </div>
          
          {/* Idle Cranes Card */}
          <div className="stat-card idle">
            <div className="stat-label">
              <i className="fas fa-pause"></i>
              <span>Idle Cranes</span>
            </div>
            <div className="stat-value">{metrics.idleCranes}</div>
            <div className="stat-unit">/1 total</div>
            <div className="stat-change">
              <span>Based on 5-min activity</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* OEE Section */}
      <div className="oee-container">
        <OEEGauge oee={oee} />
      </div>
    </div>
  );
};

export default DashboardStats;