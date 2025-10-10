// components/Demo/DataGrid.js
import React from 'react';

const DataGrid = ({ data, services, isLoading }) => {
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
    if (value === undefined || value === null || value === '--') return '--';
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
              {point.unit && <span className="data-point-unit">{point.unit}</span>}
            </div>
            <div className="data-point-value">
              {formatValue(point.value)}
            </div>
            <div className="data-point-key">{point.key}</div>
          </div>
        ))}
        
        {/* Empty state */}
        {dataPoints.length === 0 && (
          <div className="no-data-message">
            <div className="no-data-icon">📊</div>
            <div className="no-data-text">No data available</div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .data-grid-container {
          margin: 20px 0;
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          min-height: 200px;
        }
        
        .data-grid-container h3 {
          margin: 0 0 20px 0;
          color: #2c3e50;
          font-size: 18px;
          font-weight: 600;
        }
        
        .data-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
          min-height: 100px;
        }
        
        .data-point {
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 15px;
          background: #f8f9fa;
          min-height: 90px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        
        .data-point-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
          min-height: 20px;
        }
        
        .data-point-label {
          font-weight: 600;
          font-size: 14px;
          color: #2c3e50;
          text-transform: capitalize;
          line-height: 1.3;
          word-break: break-word;
        }
        
        .data-point-unit {
          font-size: 12px;
          color: #6c757d;
          background: #e9ecef;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 500;
          flex-shrink: 0;
          margin-left: 8px;
        }
        
        .data-point-value {
          font-size: 24px;
          font-weight: 700;
          color: #1976d2;
          margin: 10px 0;
          line-height: 1.2;
          min-height: 32px;
          display: flex;
          align-items: center;
        }
        
        .data-point-key {
          font-size: 10px;
          color: #adb5bd;
          font-family: monospace;
          line-height: 1.2;
        }
        
        /* Category-specific styles */
        .category-electrical {
          border-left: 4px solid #ff6b6b;
        }
        
        .category-io {
          border-left: 4px solid #4ecdc4;
        }
        
        .category-system {
          border-left: 4px solid #45b7d1;
        }
        
        .category-environment {
          border-left: 4px solid #96ceb4;
        }
        
        .category-vibration {
          border-left: 4px solid #feca57;
        }
        
        .category-load {
          border-left: 4px solid #ff9ff3;
        }
        
        .category-motor {
          border-left: 4px solid #54a0ff;
        }
        
        .category-safety {
          border-left: 4px solid #ee5253;
        }
        
        .no-data-message {
          grid-column: 1 / -1;
          text-align: center;
          padding: 40px 20px;
          color: #6c757d;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        
        .no-data-icon {
          font-size: 48px;
          opacity: 0.5;
        }
        
        .no-data-text {
          font-size: 16px;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default DataGrid;