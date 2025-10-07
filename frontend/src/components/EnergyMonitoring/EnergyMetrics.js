// components/EnergyMonitoring/EnergyMetrics.js
import React from 'react';

const EnergyMetrics = ({ metrics }) => {
  return (
    <div className="summary-cards">
      <div className="summary-card">
        <div className="summary-card-icon">
          <i className="fas fa-bolt"></i>
        </div>
        <div className="summary-card-value">{metrics.totalPower}</div>
        <div className="summary-card-label">Total Power Consumption</div>
      </div>
      <div className="summary-card">
        <div className="summary-card-icon">
          <i className="fas fa-money-bill-wave"></i>
        </div>
        <div className="summary-card-value">{metrics.energyCost}</div>
        <div className="summary-card-label">Hourly Energy Cost</div>
      </div>
      <div className="summary-card">
        <div className="summary-card-icon">
          <i className="fas fa-percentage"></i>
        </div>
        <div className="summary-card-value">{metrics.efficiency}</div>
        <div className="summary-card-label">System Efficiency</div>
      </div>
      <div className="summary-card">
        <div className="summary-card-icon">
          <i className="fas fa-balance-scale"></i>
        </div>
        <div className="summary-card-value">{metrics.energyPerTon}</div>
        <div className="summary-card-label">Energy per Ton</div>
      </div>
    </div>
  );
};

export default EnergyMetrics;