// components/Demo/DemoMetrics.js
import React from 'react';

const DemoMetrics = ({ data, services }) => {
  // Extract key metrics from services or fallback to data
  const extractKeyMetrics = () => {
    const metrics = [];

    // Try to extract from services first
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

    // Fallback to data if no service metrics found
    if (metrics.length === 0) {
      metrics.push(
        { key: 'voltage', label: 'Voltage', unit: 'V', icon: 'fas fa-bolt', value: data.voltage || 0 },
        { key: 'current', label: 'Current', unit: 'A', icon: 'fas fa-bolt', value: data.current || 0 },
        { key: 'power', label: 'Power', unit: 'kW', icon: 'fas fa-bolt', value: data.power || 0 },
        { key: 'load_weight', label: 'Load Weight', unit: 'kg', icon: 'fas fa-weight-hanging', value: data.load_weight || 0 }
      );
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