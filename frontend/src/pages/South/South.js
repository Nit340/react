import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const South = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:8000';

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔍 Fetching services from: ${API_BASE_URL}/api/proxy/config`);
      
      const response = await fetch(`${API_BASE_URL}/api/proxy/config`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📦 Received services:', result);
      
      if (result.success && result.data) {
        setServices(result.data);
      } else {
        throw new Error('Invalid response format: missing data');
      }
      
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureService = (serviceName) => {
    navigate(`/south/config/${serviceName}`);
  };

  const getServiceIcon = (serviceType) => {
    const icons = {
      crane_module: '🏗️',
      onboard_io: '🔌',
      modbus_poller: '📡',
      digital_input: '⚡',
      analog_input: '📊',
      default: '🔧'
    };
    
    return icons[serviceType] || icons.default;
  };

  const getServiceTypeDisplay = (service) => {
    return service.config?.type || service.name || 'Unknown Service';
  };

  if (loading) {
    return (
      <div className="south-page">
        <div className="page-title">
          <h1>Crane Data Flow</h1>
          <p>Loading services configuration...</p>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="south-page">
        <div className="page-title">
          <h1>Crane Data Flow</h1>
          <p>Connection Error</p>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Server Connection Failed</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchServices}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="south-page">
      <div className="page-title">
        <h1>Crane Data Flow</h1>
        <p>Crane receives data from connected services</p>
      </div>

      {/* N8N-style Flow Diagram */}
      <div className="flow-diagram">
        {/* Services Row */}
        <div className="flow-row services-row">
          <div className="flow-row-label">
            <h3>Data Sources</h3>
            <p>Services providing data to crane</p>
          </div>
          
          <div className="nodes-container">
            {services.map((service, index) => (
              <div key={index} className="service-node">
                <div className="node-header">
                  <div className="node-icon">
                    {getServiceIcon(service.config?.type || service.name)}
                  </div>
                  <div className="node-info">
                    <h4>{service.name}</h4>
                    <p>{getServiceTypeDisplay(service)}</p>
                  </div>
                </div>
                
                <div className="node-body">
                  <div className="node-stats">
                    <span className="data-points">
                      {service.data_points?.length || 0} data points
                    </span>
                    <span className="node-status connected">● Connected</span>
                  </div>
                </div>
                
                <div className="node-footer">
                  <button 
                    className="btn btn-primary btn-small"
                    onClick={() => handleConfigureService(service.name)}
                  >
                    Configure
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flow Arrows */}
        <div className="flow-arrows-row">
          <div className="flow-arrows">
            {services.map((_, index) => (
              <div key={index} className="flow-arrow">
                <div className="arrow-line"></div>
                <div className="arrow-head"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Crane Row */}
        <div className="flow-row crane-row">
          <div className="flow-row-label">
            <h3>Crane Controller</h3>
            <p>Processes data from services</p>
          </div>
          
          <div className="nodes-container">
            <div className="crane-node">
              <div className="node-header">
                <div className="node-icon crane-icon">🏗️</div>
                <div className="node-info">
                  <h4>Main Crane</h4>
                  <p>Central Controller</p>
                </div>
              </div>
              
              <div className="node-body">
                <div className="node-stats">
                  <span className="data-points">
                    {services.reduce((total, service) => total + (service.data_points?.length || 0), 0)} total data points
                  </span>
                  <span className="node-status active">● Active</span>
                </div>
              </div>
              
              <div className="node-footer">
                <div className="connected-services">
                  Connected to {services.length} services
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {services.length === 0 && !loading && (
        <div className="empty-flow">
          <div className="empty-icon">🔧</div>
          <h3>No Services Configured</h3>
          <p>No service modules found. The crane needs services to receive data.</p>
          <button className="btn btn-primary" onClick={fetchServices}>
            Check for Services
          </button>
        </div>
      )}
    </div>
  );
};

export default South;