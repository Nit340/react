// components/Demo/DataGrid.js
import React from 'react';

const DataGrid = ({ data, services }) => {
  // Create data points from services
  const getDataPoints = () => {
    const serviceDataPoints = [];
    
    if (services && services.length > 0) {
      services.forEach(service => {
        service.assets.forEach(asset => {
          serviceDataPoints.push({
            key: `${service.name}_${asset.id}`,
            label: `${service.name} ${asset.id}`,
            unit: getUnitForAsset(asset.id),
            category: getCategoryForService(service.name),
            value: asset.value
          });
        });
      });
    }

    return serviceDataPoints;
  };

  const getUnitForAsset = (assetId) => {
    if (assetId.includes('V')) return 'V';
    if (assetId.includes('I')) return 'A';
    return '';
  };

  const getCategoryForService = (serviceName) => {
    const categoryMap = {
      'onboard_io': 'io',
      'modbus': 'electrical'
    };
    return categoryMap[serviceName] || 'system';
  };

  const dataPoints = getDataPoints();

  const getCategoryClass = (category) => {
    const categoryClasses = {
      environment: 'category-environment',
      electrical: 'category-electrical',
      vibration: 'category-vibration',
      load: 'category-load',
      motor: 'category-motor',
      safety: 'category-safety',
      system: 'category-system',
      io: 'category-io'
    };
    return categoryClasses[category] || '';
  };

  const formatValue = (value) => {
    if (value === undefined || value === null || value === '--') return 'N/A';
    if (value === 0 || value === 1) return value === 1 ? 'Active' : 'Inactive';
    return typeof value === 'number' ? value.toFixed(2) : value;
  };

  return (
    <div className="data-grid-container">
      <h3>All Data Points ({dataPoints.length} Parameters)</h3>
      <div className="data-grid">
        {dataPoints.map(point => (
          <div 
            key={point.key} 
            className={`data-point ${getCategoryClass(point.category)}`}
          >
            <div className="data-point-header">
              <span className="data-point-label">{point.label}</span>
              <span className="data-point-unit">{point.unit}</span>
            </div>
            <div className="data-point-value">
              {formatValue(point.value)}
            </div>
            <div className="data-point-key">{point.key}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataGrid;