import React from 'react';

const OEEGauge = ({ oee }) => {
  const calculateOffset = (percentage) => {
    const circumference = 2 * Math.PI * 50;
    return circumference - (percentage / 100) * circumference;
  };

  const metrics = [
    { key: 'oee', label: 'OEE', description: 'Overall equipment effectiveness', color: 'oee' },
    { key: 'availability', label: 'Availability', description: 'Uptime vs planned production', color: 'availability' },
    { key: 'performance', label: 'Performance', description: 'Speed vs ideal cycle time', color: 'performance' },
    { key: 'quality', label: 'Quality', description: 'Good parts vs total produced', color: 'quality' }
  ];

  return (
    <>
      <div className="oee-header">
        <div className="oee-title">
          <i className="fas fa-chart-pie"></i>
          <h3>Overall Equipment Effectiveness</h3>
        </div>
        <div className="oee-trend">
          <i className="fas fa-arrow-up trend-up"></i>
          <span>2.5% from last week</span>
        </div>
      </div>
      
      <div className="oee-metrics-row">
        {metrics.map(metric => (
          <div key={metric.key} className={`oee-metric-card ${metric.color}`}>
            <div className="metric-gauge">
              <svg className="gauge-svg" viewBox="0 0 120 120">
                <circle 
                  className="gauge-circle gauge-background" 
                  cx="60" cy="60" r="50" 
                  strokeWidth="10"
                ></circle>
                <circle 
                  className="gauge-circle gauge-fill" 
                  cx="60" cy="60" r="50" 
                  strokeWidth="10"
                  strokeDasharray="314" 
                  strokeDashoffset={calculateOffset(oee[metric.key])}
                ></circle>
              </svg>
              <div className="gauge-text">
                <div className="metric-value">{oee[metric.key]}%</div>
              </div>
            </div>
            <div className="metric-label">{metric.label}</div>
            <div className="metric-description">{metric.description}</div>
          </div>
        ))}
      </div>
    </>
  );
};

export default OEEGauge;