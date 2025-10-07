// components/OperationsLog/OperationsMetrics.js
import React from 'react';

const OperationsMetrics = ({ metrics }) => {
  return (
    <div className="metrics-dashboard">
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-icon icon-hoist">
            <i className="fas fa-arrow-up"></i>
          </div>
          <div className="metric-title">HOIST</div>
        </div>
        <div className="metric-value">{metrics.hoist.total}</div>
        <div className="metric-details">
          <div className="metric-detail">
            <div className="detail-value">{metrics.hoist.up}</div>
            <div className="detail-label">UP</div>
          </div>
          <div className="metric-detail">
            <div className="detail-value">{metrics.hoist.down}</div>
            <div className="detail-label">DOWN</div>
          </div>
        </div>
      </div>
      
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-icon icon-travel">
            <i className="fas fa-exchange-alt"></i>
          </div>
          <div className="metric-title">CT</div>
        </div>
        <div className="metric-value">{metrics.ct.total}</div>
        <div className="metric-details">
          <div className="metric-detail">
            <div className="detail-value">{metrics.ct.left}</div>
            <div className="detail-label">LEFT</div>
          </div>
          <div className="metric-detail">
            <div className="detail-value">{metrics.ct.right}</div>
            <div className="detail-label">RIGHT</div>
          </div>
        </div>
      </div>
      
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-icon icon-travel">
            <i className="fas fa-arrows-alt-h"></i>
          </div>
          <div className="metric-title">LT</div>
        </div>
        <div className="metric-value">{metrics.lt.total}</div>
        <div className="metric-details">
          <div className="metric-detail">
            <div className="detail-value">{metrics.lt.forward}</div>
            <div className="detail-label">FWD</div>
          </div>
          <div className="metric-detail">
            <div className="detail-value">{metrics.lt.reverse}</div>
            <div className="detail-label">REV</div>
          </div>
        </div>
      </div>
      
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-icon icon-switch">
            <i className="fas fa-random"></i>
          </div>
          <div className="metric-title">SWITCH</div>
        </div>
        <div className="metric-value">{metrics.switch}</div>
      </div>
      
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-icon icon-duration">
            <i className="fas fa-clock"></i>
          </div>
          <div className="metric-title">DURATION</div>
        </div>
        <div className="metric-value">{metrics.duration}</div>
      </div>
      
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-icon icon-load">
            <i className="fas fa-weight-hanging"></i>
          </div>
          <div className="metric-title">LOAD</div>
        </div>
        <div className="metric-value">{metrics.load}</div>
      </div>
    </div>
  );
};

export default OperationsMetrics;