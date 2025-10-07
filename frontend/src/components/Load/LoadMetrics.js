// components/Load/LoadMetrics.js
import React from 'react';

const LoadMetrics = ({ metrics }) => {
  return (
    <div className="metrics-container">
      <div className="metric-card">
        <div className="metric-title">
          <i className="fas fa-weight-hanging"></i>
          Current Load
        </div>
        <div className="metric-value">
          {metrics.currentLoad} <span>kg</span>
        </div>
        <div className="metric-subtext">Across all cranes</div>
      </div>
      
      <div className="metric-card">
        <div className="metric-title">
          <i className="fas fa-chart-line"></i>
          Average Capacity
        </div>
        <div className="metric-value">
          {metrics.averageCapacity} <span>%</span>
        </div>
        <div className="metric-subtext">Utilization rate</div>
      </div>
      
      <div className="metric-card">
        <div className="metric-title">
          <i className="fas fa-arrow-up"></i>
          Max Capacity
        </div>
        <div className="metric-value">
          {metrics.maxCapacity} <span>kg</span>
        </div>
        <div className="metric-subtext">CRN-004 (6T capacity)</div>
      </div>
      
      <div className="metric-card">
        <div className="metric-title">
          <i className="fas fa-exclamation-triangle"></i>
          Overall Status
        </div>
        <div className="metric-value">{metrics.overallStatus}</div>
        <div className="metric-subtext">No active overloads</div>
      </div>
    </div>
  );
};

export default LoadMetrics;