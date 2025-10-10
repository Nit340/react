// components/Demo/DemoMetrics.js
import React from 'react';

const DemoMetrics = ({ data, services, isLoading }) => {
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

    // Always return exactly 4 metrics to prevent layout shifts
    while (metrics.length < 4) {
      metrics.push({
        key: `placeholder-${metrics.length}`,
        label: 'Loading...',
        unit: '',
        icon: 'fas fa-spinner',
        value: '--'
      });
    }

    return metrics.slice(0, 4);
  };

  const keyMetrics = extractKeyMetrics();

  return (
    <div className="demo-metrics">
      {keyMetrics.map(metric => (
        <div 
          key={metric.key} 
          className={`metric-card ${metric.value === '--' ? 'placeholder' : ''}`}
        >
          <div className="metric-icon">
            <i className={metric.icon}></i>
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {metric.value} {metric.unit && <span className="metric-unit">{metric.unit}</span>}
            </div>
            <div className="metric-label">{metric.label}</div>
          </div>
        </div>
      ))}
      
      <style jsx>{`
        .demo-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin: 20px 0;
          min-height: 120px;
        }
        
        @media (max-width: 1024px) {
          .demo-metrics {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 480px) {
          .demo-metrics {
            grid-template-columns: 1fr;
          }
        }
        
        .metric-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border: 1px solid #e1e5e9;
          display: flex;
          align-items: center;
          gap: 15px;
          min-height: 100px;
        }
        
        .metric-card.placeholder {
          opacity: 0.6;
        }
        
        .metric-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          flex-shrink: 0;
        }
        
        .metric-card.placeholder .metric-icon {
          background: #e9ecef;
        }
        
        .metric-content {
          flex: 1;
          min-width: 0;
        }
        
        .metric-value {
          font-size: 24px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 5px;
          line-height: 1.2;
        }
        
        .metric-card.placeholder .metric-value {
          color: #adb5bd;
        }
        
        .metric-unit {
          font-size: 16px;
          color: #6c757d;
          font-weight: 500;
        }
        
        .metric-card.placeholder .metric-unit {
          color: #ced4da;
        }
        
        .metric-label {
          font-size: 14px;
          color: #6c757d;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          line-height: 1.3;
        }
        
        .metric-card.placeholder .metric-label {
          color: #ced4da;
        }
      `}</style>
    </div>
  );
};

export default DemoMetrics;