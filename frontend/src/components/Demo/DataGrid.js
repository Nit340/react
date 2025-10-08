// components/Demo/DataGrid.js
import React from 'react';

const DataGrid = ({ data, services }) => {
  // Create data points from services or use legacy data
  const getDataPoints = () => {
    if (services && services.length > 0) {
      // Create from services
      const serviceDataPoints = [];
      
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

      return serviceDataPoints;
    }

    // Fallback to legacy data points
    return [
      { key: 'temperature', label: 'Temperature', unit: '°C', category: 'environment', value: data.temperature },
      { key: 'humidity', label: 'Humidity', unit: '%', category: 'environment', value: data.humidity },
      { key: 'pressure', label: 'Pressure', unit: 'Pa', category: 'environment', value: data.pressure },
      { key: 'voltage', label: 'Voltage', unit: 'V', category: 'electrical', value: data.voltage },
      { key: 'current', label: 'Current', unit: 'A', category: 'electrical', value: data.current },
      { key: 'power', label: 'Power', unit: 'kW', category: 'electrical', value: data.power },
      { key: 'frequency', label: 'Frequency', unit: 'Hz', category: 'electrical', value: data.frequency },
      { key: 'vibration_x', label: 'Vibration X', unit: 'm/s²', category: 'vibration', value: data.vibration_x },
      { key: 'vibration_y', label: 'Vibration Y', unit: 'm/s²', category: 'vibration', value: data.vibration_y },
      { key: 'vibration_z', label: 'Vibration Z', unit: 'm/s²', category: 'vibration', value: data.vibration_z },
      { key: 'load_weight', label: 'Load Weight', unit: 'kg', category: 'load', value: data.load_weight },
      { key: 'load_position', label: 'Load Position', unit: 'm', category: 'load', value: data.load_position },
      { key: 'motor_speed', label: 'Motor Speed', unit: 'RPM', category: 'motor', value: data.motor_speed },
      { key: 'brake_status', label: 'Brake Status', unit: '', category: 'safety', value: data.brake_status },
      { key: 'safety_status', label: 'Safety Status', unit: '', category: 'safety', value: data.safety_status },
      { key: 'operational_mode', label: 'Operational Mode', unit: '', category: 'system', value: data.operational_mode }
    ];
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