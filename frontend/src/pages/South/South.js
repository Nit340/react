import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const South = () => {
  const [craneConfig, setCraneConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCraneConfig();
  }, []);

  const fetchCraneConfig = async () => {
    try {
      setLoading(true);
      // Simulate API call - replace with actual backend
      setTimeout(() => {
        const defaultConfig = {
          deviceId: 'crane-001',
          name: 'Main Crane',
          protocol: 'modbus',
          status: 'disconnected',
          endpoint: '192.168.1.100',
          port: 502,
          pollingInterval: 30,
          timeout: 10,
          retryCount: 3,
          modbusConfig: {
            unitId: 1,
            functionCode: 3,
            startingAddress: 0,
            quantity: 10,
            byteOrder: 'big_endian'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setCraneConfig(defaultConfig);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Failed to fetch crane config:', error);
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
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading...</p>
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
            <div className="device-icon">
              <i className="fas fa-crane"></i>
            </div>
            <div className="device-info">
              <h3 className="device-name" title={craneConfig.name}>
                {craneConfig.name}
              </h3>
              <p className="device-protocol">
                {craneConfig.protocol?.toUpperCase()} • {craneConfig.deviceId}
              </p>
            </div>
            {getStatusBadge(craneConfig.status)}
          </div>

          <div className="device-card-body">
            <div className="device-detail">
              <label>Endpoint:</label>
              <span title={`${craneConfig.endpoint}:${craneConfig.port}`}>
                {craneConfig.endpoint}:{craneConfig.port}
              </span>
            </div>
            <div className="device-detail">
              <label>Polling:</label>
              <span>{craneConfig.pollingInterval}s</span>
            </div>
            <div className="device-detail">
              <label>Updated:</label>
              <span>{new Date(craneConfig.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="device-card-footer">
            <button 
              className="btn btn-primary"
              onClick={handleConfigure}
            >
              <i className="fas fa-cog"></i>
              Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default South;