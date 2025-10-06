import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SouthConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Get API URL from environment variables
  const API_BASE_URL = 'http://localhost:8000';

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔍 Fetching config from: ${API_BASE_URL}/api/crane/config/`);
      
      // Create a more detailed fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}/api/crane/config/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log(`Response status: ${response.status}`);
      console.log(`Response status text: ${response.statusText}`);
      console.log(`Response headers:`, [...response.headers.entries()]);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const configData = await response.json();
      console.log('📦 Received config:', configData);
      setConfig(configData);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Request timeout:', error);
        setError('Request timeout - server is not responding');
      } else {
        console.error('Failed to fetch config:', error);
        setError(error.message);
      }
      // Set default config as fallback
      setConfig(getDefaultConfig());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultConfig = () => {
    return {
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
        byteOrder: 'big_endian',
        dataType: 'uint16'
      },
      updatedAt: new Date().toISOString()
    };
  };

  const handleInputChange = (path, value) => {
    setConfig(prevConfig => {
      const newConfig = JSON.parse(JSON.stringify(prevConfig));
      
      if (path.includes('.')) {
        // Handle nested paths like 'modbusConfig.unitId'
        const keys = path.split('.');
        let current = newConfig;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
      } else {
        // Handle top-level paths
        newConfig[path] = value;
      }
      
      return newConfig;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      console.log('💾 Saving config:', config);
      console.log('Sending POST request to:', `${API_BASE_URL}/api/crane/config/`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}/api/crane/config/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          updatedAt: new Date().toISOString()
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      console.log(`Save response status: ${response.status}`);
      console.log(`Save response status text: ${response.statusText}`);
      console.log(`Save response headers:`, [...response.headers.entries()]);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const savedConfig = await response.json();
      console.log('✅ Config saved successfully:', savedConfig);
      
      alert('Configuration saved successfully!');
      navigate('/south');
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Save request timeout:', error);
        setError('Save request timeout - server is not responding');
      } else {
        console.error('Failed to save config:', error);
        setError(error.message);
      }
      alert(`Failed to save configuration: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/south');
  };

  if (loading) {
    return (
      <div className="south-config-page">
        <div className="page-header">
          <div className="header-content">
            <h1>Crane Configuration</h1>
            <p>Loading configuration from backend...</p>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading configuration...</p>
          </div>
          <p className="api-info">API URL: {API_BASE_URL}/api/crane/config/</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="south-config-page">
        <div className="page-header">
          <div className="header-content">
            <h1>Crane Configuration</h1>
            <p>No configuration data available</p>
          </div>
        </div>
        <div className="error-container">
          <div className="error-content">
            <h2>⚠️ Configuration Error</h2>
            <p>Unable to load configuration data</p>
            <p className="error-message">Error: {error}</p>
            <button className="btn btn-primary" onClick={fetchConfig}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="south-config-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Crane Configuration</h1>
          <p>Configure your crane device settings</p>
          {config.updatedAt && (
            <p className="config-info">
              Last updated: {new Date(config.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <span className="alert-message">{error}</span>
        </div>
      )}

      <div className="config-container">
        {/* Basic Configuration */}
        <div className="config-section">
          <div className="section-header">
            <h2>Basic Configuration</h2>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="deviceName">Device Name</label>
              <input
                id="deviceName"
                type="text"
                value={config.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter device name"
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="deviceId">Device ID</label>
              <input
                id="deviceId"
                type="text"
                value={config.deviceId || ''}
                onChange={(e) => handleInputChange('deviceId', e.target.value)}
                placeholder="Enter device ID"
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="protocol">Protocol</label>
              <select
                id="protocol"
                value={config.protocol || 'modbus'}
                onChange={(e) => handleInputChange('protocol', e.target.value)}
                className="form-select"
              >
                <option value="modbus">Modbus TCP</option>
                <option value="opcua">OPC UA</option>
                <option value="mqtt">MQTT</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={config.status || 'disconnected'}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="form-select"
              >
                <option value="connected">Connected</option>
                <option value="disconnected">Disconnected</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="endpoint">Endpoint/Host</label>
              <input
                id="endpoint"
                type="text"
                value={config.endpoint || ''}
                onChange={(e) => handleInputChange('endpoint', e.target.value)}
                placeholder="192.168.1.100"
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="port">Port</label>
              <input
                id="port"
                type="number"
                value={config.port || 502}
                onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 502)}
                placeholder="502"
                min="1"
                max="65535"
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Connection Settings */}
        <div className="config-section">
          <div className="section-header">
            <h2>Connection Settings</h2>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="pollingInterval">Polling Interval (seconds)</label>
              <input
                id="pollingInterval"
                type="number"
                value={config.pollingInterval || 30}
                onChange={(e) => handleInputChange('pollingInterval', parseInt(e.target.value) || 30)}
                min="1"
                max="3600"
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="timeout">Timeout (seconds)</label>
              <input
                id="timeout"
                type="number"
                value={config.timeout || 10}
                onChange={(e) => handleInputChange('timeout', parseInt(e.target.value) || 10)}
                min="1"
                max="300"
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="retryCount">Retry Count</label>
              <input
                id="retryCount"
                type="number"
                value={config.retryCount || 3}
                onChange={(e) => handleInputChange('retryCount', parseInt(e.target.value) || 3)}
                min="0"
                max="10"
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Modbus Configuration */}
        <div className="config-section">
          <div className="section-header">
            <h2>Modbus Configuration</h2>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="unitId">Unit ID</label>
              <input
                id="unitId"
                type="number"
                value={config.modbusConfig?.unitId || 1}
                onChange={(e) => handleInputChange('modbusConfig.unitId', parseInt(e.target.value) || 1)}
                min="1"
                max="247"
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="functionCode">Function Code</label>
              <select
                id="functionCode"
                value={config.modbusConfig?.functionCode || 3}
                onChange={(e) => handleInputChange('modbusConfig.functionCode', parseInt(e.target.value))}
                className="form-select"
              >
                <option value={1}>01 - Read Coils</option>
                <option value={2}>02 - Read Discrete Inputs</option>
                <option value={3}>03 - Read Holding Registers</option>
                <option value={4}>04 - Read Input Registers</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="startingAddress">Starting Address</label>
              <input
                id="startingAddress"
                type="number"
                value={config.modbusConfig?.startingAddress || 0}
                onChange={(e) => handleInputChange('modbusConfig.startingAddress', parseInt(e.target.value) || 0)}
                min="0"
                max="65535"
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="quantity">Quantity</label>
              <input
                id="quantity"
                type="number"
                value={config.modbusConfig?.quantity || 10}
                onChange={(e) => handleInputChange('modbusConfig.quantity', parseInt(e.target.value) || 10)}
                min="1"
                max="125"
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="byteOrder">Byte Order</label>
              <select
                id="byteOrder"
                value={config.modbusConfig?.byteOrder || 'big_endian'}
                onChange={(e) => handleInputChange('modbusConfig.byteOrder', e.target.value)}
                className="form-select"
              >
                <option value="big_endian">Big Endian</option>
                <option value="little_endian">Little Endian</option>
                <option value="big_endian_byte_swap">Big Endian Byte Swap</option>
                <option value="little_endian_byte_swap">Little Endian Byte Swap</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="dataType">Data Type</label>
              <select
                id="dataType"
                value={config.modbusConfig?.dataType || 'uint16'}
                onChange={(e) => handleInputChange('modbusConfig.dataType', e.target.value)}
                className="form-select"
              >
                <option value="uint16">UInt16</option>
                <option value="int16">Int16</option>
                <option value="uint32">UInt32</option>
                <option value="int32">Int32</option>
                <option value="float">Float</option>
              </select>
            </div>
          </div>
        </div>

        {/* JSON View (Read-only for debugging) */}
        <div className="config-section">
          <div className="section-header">
            <h2>Configuration JSON</h2>
            <p className="section-description">Read-only view of current configuration</p>
          </div>
          <div className="json-viewer">
            <pre className="json-content">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-small"></span>
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SouthConfig;