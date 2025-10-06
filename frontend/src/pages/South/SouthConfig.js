import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SouthConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      // Replace with your actual backend API endpoint
      const response = await fetch('/api/crane/config');
      if (response.ok) {
        const configData = await response.json();
        setConfig(configData);
      } else {
        // If no config exists, create a default one
        setConfig(getDefaultConfig());
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
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
      }
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
      
      // Replace with your actual backend API endpoint
      const response = await fetch('/api/crane/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          updatedAt: new Date().toISOString()
        }),
      });

      if (response.ok) {
        alert('Configuration saved successfully!');
        navigate('/south');
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration. Please try again.');
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
        <div className="page-title">
          <h1>Crane Configuration</h1>
          <p>Loading configuration...</p>
        </div>
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="south-config-page">
      <div className="page-title">
        <h1>Crane Configuration</h1>
        <p>Configure your crane device settings</p>
      </div>

      <div className="south-config-form">
        {/* Basic Configuration */}
        <div className="form-section">
          <h3>Basic Configuration</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Device Name</label>
              <input
                type="text"
                value={config.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter device name"
              />
            </div>

            <div className="form-group">
              <label>Device ID</label>
              <input
                type="text"
                value={config.deviceId || ''}
                onChange={(e) => handleInputChange('deviceId', e.target.value)}
                placeholder="Enter device ID"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Protocol</label>
              <select
                value={config.protocol || 'modbus'}
                onChange={(e) => handleInputChange('protocol', e.target.value)}
              >
                <option value="modbus">Modbus TCP</option>
                <option value="opcua">OPC UA</option>
                <option value="mqtt">MQTT</option>
              </select>
            </div>

            <div className="form-group">
              <label>Endpoint/Host</label>
              <input
                type="text"
                value={config.endpoint || ''}
                onChange={(e) => handleInputChange('endpoint', e.target.value)}
                placeholder="192.168.1.100"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Port</label>
              <input
                type="number"
                value={config.port || ''}
                onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                placeholder="502"
              />
            </div>

            <div className="form-group">
              <label>Polling Interval (seconds)</label>
              <input
                type="number"
                value={config.pollingInterval || 30}
                onChange={(e) => handleInputChange('pollingInterval', parseInt(e.target.value))}
                min="1"
                max="3600"
              />
            </div>
          </div>
        </div>

        {/* Connection Settings */}
        <div className="form-section">
          <h3>Connection Settings</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Timeout (seconds)</label>
              <input
                type="number"
                value={config.timeout || 10}
                onChange={(e) => handleInputChange('timeout', parseInt(e.target.value))}
                min="1"
                max="300"
              />
            </div>

            <div className="form-group">
              <label>Retry Count</label>
              <input
                type="number"
                value={config.retryCount || 3}
                onChange={(e) => handleInputChange('retryCount', parseInt(e.target.value))}
                min="0"
                max="10"
              />
            </div>
          </div>
        </div>

        {/* Protocol Specific Configuration */}
        <div className="form-section">
          <h3>Modbus Configuration</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Unit ID</label>
              <input
                type="number"
                value={config.modbusConfig?.unitId || 1}
                onChange={(e) => handleInputChange('modbusConfig.unitId', parseInt(e.target.value))}
                min="1"
                max="247"
              />
            </div>

            <div className="form-group">
              <label>Function Code</label>
              <select
                value={config.modbusConfig?.functionCode || 3}
                onChange={(e) => handleInputChange('modbusConfig.functionCode', parseInt(e.target.value))}
              >
                <option value={1}>01 - Read Coils</option>
                <option value={2}>02 - Read Discrete Inputs</option>
                <option value={3}>03 - Read Holding Registers</option>
                <option value={4}>04 - Read Input Registers</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Starting Address</label>
              <input
                type="number"
                value={config.modbusConfig?.startingAddress || 0}
                onChange={(e) => handleInputChange('modbusConfig.startingAddress', parseInt(e.target.value))}
                min="0"
                max="65535"
              />
            </div>

            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                value={config.modbusConfig?.quantity || 10}
                onChange={(e) => handleInputChange('modbusConfig.quantity', parseInt(e.target.value))}
                min="1"
                max="125"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Byte Order</label>
              <select
                value={config.modbusConfig?.byteOrder || 'big_endian'}
                onChange={(e) => handleInputChange('modbusConfig.byteOrder', e.target.value)}
              >
                <option value="big_endian">Big Endian</option>
                <option value="little_endian">Little Endian</option>
                <option value="big_endian_byte_swap">Big Endian Byte Swap</option>
                <option value="little_endian_byte_swap">Little Endian Byte Swap</option>
              </select>
            </div>

            <div className="form-group">
              <label>Data Type</label>
              <select
                value={config.modbusConfig?.dataType || 'uint16'}
                onChange={(e) => handleInputChange('modbusConfig.dataType', e.target.value)}
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

        {/* JSON View (Read-only for reference) */}
        <div className="form-section">
          <h3>Configuration JSON</h3>
          <div className="form-group">
            <label>Current Configuration (Read-only)</label>
            <pre className="config-json">
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
                <i className="fas fa-spinner fa-spin"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SouthConfig;