// components/Demo/DemoMetrics.js
import React from 'react';

const DemoMetrics = ({ data, services }) => {
  // Extract key metrics from services
  const extractKeyMetrics = () => {
    const metrics = [];

    // Extract from services
    if (services && services.length > 0) {
      services.forEach(service => {
        service.assets.forEach(asset => {
          if (asset.id === 'V1' || asset.id === 'V2') {
            metrics.push({
              key: asset.id,
              label: `Voltage ${asset.id}`,
              unit: 'V',
              icon: 'fas fa-bolt',
              value: asset.value
            });
          } else if (asset.id === 'I1' || asset.id === 'I2') {
            metrics.push({
              key: asset.id,
              label: `Current ${asset.id}`,
              unit: 'A',
              icon: 'fas fa-bolt',
              value: asset.value
            });
          }
        });
      });
    }

    // Ensure we have exactly 4 metrics
    return metrics.slice(0, 4);
  };

  const keyMetrics = extractKeyMetrics();

  return (
    <div className="demo-metrics">
      {keyMetrics.map(metric => (
        <div key={metric.key} className="metric-card">
          <div className="metric-icon">
            <i className={metric.icon}></i>
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {metric.value} <span className="metric-unit">{metric.unit}</span>
            </div>
            <div className="metric-label">{metric.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DemoMetrics;