import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const South = () => {
  const [craneConfig, setCraneConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCraneConfig();
  }, []);

  const API_BASE_URL = 'http://localhost:8000';

  const fetchCraneConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔍 Fetching config from: ${API_BASE_URL}/api/proxy/config`);
      
      const response = await fetch(`${API_BASE_URL}/api/proxy/config`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📦 Received config result:', result);
      
      // Extract the actual config data from the response
      if (result.success && result.data) {
        setCraneConfig(result.data);
      } else {
        throw new Error('Invalid response format: missing data');
      }
      
    } catch (error) {
      console.error('Failed to fetch crane config:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigure = () => {
    navigate('/south/config');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      connected: { class: 'status-connected', text: 'Connected' },
      disconnected: { class: 'status-disconnected', text: 'Disconnected' },
      error: { class: 'status-error', text: 'Error' }
    };
    const config = statusConfig[status] || statusConfig.disconnected;
    return (
      <span className={`status-badge ${config.class}`}>
        <span className={`status-indicator ${status}`}></span>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="south-page">
        <div className="page-title">
          <h1>South Devices</h1>
          <p>Loading crane configuration...</p>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="south-page">
        <div className="page-title">
          <h1>South Devices</h1>
          <p>Connection Error</p>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Server Connection Failed</h3>
          <p>{error}</p>
          <div className="troubleshooting">
            <p><strong>To fix this:</strong></p>
            <ol>
              <li>Make sure Flask server is running</li>
              <li>Check if port 5001 is available</li>
              <li>Verify no firewall is blocking the connection</li>
            </ol>
          </div>
          <button className="btn btn-primary" onClick={fetchCraneConfig}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Check if craneConfig exists and has the expected structure
  if (!craneConfig) {
    return (
      <div className="south-page">
        <div className="page-title">
          <h1>South Devices</h1>
          <p>No configuration data available</p>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>No Configuration Data</h3>
          <p>Unable to load crane configuration</p>
          <button className="btn btn-primary" onClick={fetchCraneConfig}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="south-page">
      <div className="page-title">
        <h1>South Devices</h1>
        <p>Manage your crane device configuration</p>
      </div>

      <div className="south-devices-grid">
        <div className="south-device-card">
          <div className="device-card-header">
            <div className="device-icon">🏗️</div>
            <div className="device-info">
              <h3 className="device-name" title={craneConfig.name}>
                {craneConfig.name || 'Unnamed Device'}
              </h3>
              <p className="device-protocol">
                {(craneConfig.protocol || 'Unknown')?.toUpperCase()} • {craneConfig.deviceId || 'No ID'}
              </p>
            </div>
            {getStatusBadge(craneConfig.status || 'disconnected')}
          </div>

          <div className="device-card-body">
            <div className="device-detail">
              <label>Endpoint:</label>
              <span title={`${craneConfig.endpoint || 'N/A'}:${craneConfig.port || 'N/A'}`}>
                {craneConfig.endpoint || 'N/A'}:{craneConfig.port || 'N/A'}
              </span>
            </div>
            <div className="device-detail">
              <label>Polling:</label>
              <span>{craneConfig.pollingInterval || 'N/A'}s</span>
            </div>
            <div className="device-detail">
              <label>Updated:</label>
              <span>
                {craneConfig.updatedAt 
                  ? new Date(craneConfig.updatedAt).toLocaleDateString() 
                  : 'Unknown'
                }
              </span>
            </div>
          </div>

          <div className="device-card-footer">
            <button 
              className="btn btn-primary"
              onClick={handleConfigure}
            >
              ⚙️ Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default South;