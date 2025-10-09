import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const SouthConfig = () => {
  const [services, setServices] = useState([]);
  const [currentService, setCurrentService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { serviceName } = useParams();
   
  const API_BASE_URL = 'http://localhost:8000';

  useEffect(() => {
    fetchServices();
  }, [serviceName]);

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
        
        // Find the current service by name
        const service = result.data.find(s => s.name === serviceName);
        if (service) {
          setCurrentService(service);
        } else {
          throw new Error(`Service '${serviceName}' not found`);
        }
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

  const updateServiceInList = (updatedService) => {
    const updatedServices = services.map(service => 
      service.name === serviceName ? updatedService : service
    );
    setServices(updatedServices);
    setCurrentService(updatedService);
  };

  const handleConfigChange = (key, value) => {
    if (!currentService) return;
    
    const updatedService = {
      ...currentService,
      config: {
        ...currentService.config,
        [key]: value
      }
    };
    
    setCurrentService(updatedService);
  };

  const handleDataPointChange = (index, field, value) => {
    if (!currentService || !currentService.data_points) return;
    
    const updatedDataPoints = [...currentService.data_points];
    updatedDataPoints[index] = {
      ...updatedDataPoints[index],
      [field]: value
    };
    
    const updatedService = {
      ...currentService,
      data_points: updatedDataPoints
    };
    
    setCurrentService(updatedService);
  };

  const addDataPoint = () => {
    if (!currentService) return;
    
    // Create a new data point with default values based on service type
    const newDataPoint = createDefaultDataPoint(currentService.name);
    
    const updatedService = {
      ...currentService,
      data_points: [...(currentService.data_points || []), newDataPoint]
    };
    
    setCurrentService(updatedService);
  };

  const createDefaultDataPoint = (serviceName) => {
    const basePoint = {
      name: `new_point_${Date.now()}`,
      type: 'float'
    };

    // Add service-specific default fields
    switch (serviceName) {
      case 'modbus_poller':
        return {
          ...basePoint,
          register_type: 'holding_register',
          address: (currentService?.data_points?.length || 0) * 10,
          data_type: 'float'
        };
      case 'onboard_io':
        return {
          ...basePoint,
          type: 'boolean'
        };
      default:
        return basePoint;
    }
  };

  const removeDataPoint = (index) => {
    if (!currentService || !currentService.data_points) return;
    
    const updatedDataPoints = currentService.data_points.filter((_, i) => i !== index);
    const updatedService = {
      ...currentService,
      data_points: updatedDataPoints
    };
    
    setCurrentService(updatedService);
  };

  const duplicateDataPoint = (index) => {
    if (!currentService || !currentService.data_points) return;
    
    const pointToDuplicate = currentService.data_points[index];
    const duplicatedPoint = {
      ...pointToDuplicate,
      name: `${pointToDuplicate.name}_copy_${Date.now()}`
    };
    
    const updatedDataPoints = [...currentService.data_points];
    updatedDataPoints.splice(index + 1, 0, duplicatedPoint);
    
    const updatedService = {
      ...currentService,
      data_points: updatedDataPoints
    };
    
    setCurrentService(updatedService);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (!currentService) {
        throw new Error('No service data to save');
      }
      
      console.log('💾 Saving service:', currentService);
      
      // Update the services list with current service
      const updatedServices = services.map(service => 
        service.name === serviceName ? currentService : service
      );
      
      const response = await fetch(`${API_BASE_URL}/api/proxy/config/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedServices),
      });
      
      console.log(`Save response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const savedResult = await response.json();
      console.log('✅ Save successful:', savedResult);
      
      alert('Service configuration saved successfully!');
      navigate('/south');
      
    } catch (error) {
      console.error('Failed to save service config:', error);
      setError(error.message);
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
            <h1>Service Configuration</h1>
            <p>Loading {serviceName} configuration...</p>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading service configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentService) {
    return (
      <div className="south-config-page">
        <div className="page-header">
          <div className="header-content">
            <h1>Service Configuration</h1>
            <p>Error loading service</p>
          </div>
        </div>
        <div className="error-container">
          <div className="error-content">
            <h2>⚠️ Service Error</h2>
            <p>Unable to load service configuration</p>
            <p className="error-message">Error: {error}</p>
            <button className="btn btn-primary" onClick={fetchServices}>
              Retry
            </button>
            <button className="btn btn-secondary" onClick={handleCancel}>
              Back to Services
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
          <h1>{currentService.name} Configuration</h1>
          <p>Configure service settings and data points</p>
          <div className="service-badge">
            <span className="badge">{currentService.config?.type || 'generic'}</span>
            <span className="badge">{currentService.data_points?.length || 0} Data Points</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <span className="alert-message">{error}</span>
        </div>
      )}

      <div className="config-container">
        {/* Service Configuration */}
        <div className="config-section">
          <div className="section-header">
            <h2>Service Configuration</h2>
          </div>
          <div className="form-grid">
            {currentService.config && Object.entries(currentService.config).map(([key, value]) => (
              <div key={key} className="form-field">
                <label htmlFor={key}>{key.replace(/_/g, ' ').toUpperCase()}</label>
                <input
                  id={key}
                  type="text"
                  value={value || ''}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                  placeholder={`Enter ${key}`}
                  className="form-input"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Data Points Configuration */}
        <div className="config-section">
          <div className="section-header">
            <div className="section-title">
              <h2>Data Points</h2>
              <span className="data-points-count">
                ({currentService.data_points?.length || 0})
              </span>
            </div>
            <div className="section-actions">
              <button 
                className="btn btn-outline btn-small"
                onClick={addDataPoint}
              >
                + Add Data Point
              </button>
            </div>
          </div>
          
          {currentService.data_points && currentService.data_points.length > 0 ? (
            <div className="data-points-container">
              {currentService.data_points.map((point, index) => (
                <div key={index} className="data-point-card">
                  <div className="data-point-header">
                    <h4>
                      <span className="point-number">#{index + 1}</span>
                      {point.name}
                    </h4>
                    <div className="data-point-actions">
                      <button 
                        className="btn btn-outline btn-small"
                        onClick={() => duplicateDataPoint(index)}
                        title="Duplicate"
                      >
                        📋
                      </button>
                      <button 
                        className="btn btn-danger btn-small"
                        onClick={() => removeDataPoint(index)}
                        title="Remove"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="form-grid compact">
                    <div className="form-field">
                      <label htmlFor={`point-name-${index}`}>Name</label>
                      <input
                        id={`point-name-${index}`}
                        type="text"
                        value={point.name || ''}
                        onChange={(e) => handleDataPointChange(index, 'name', e.target.value)}
                        placeholder="Enter data point name"
                        className="form-input"
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor={`point-type-${index}`}>Type</label>
                      <select
                        id={`point-type-${index}`}
                        value={point.type || 'string'}
                        onChange={(e) => handleDataPointChange(index, 'type', e.target.value)}
                        className="form-select"
                      >
                        <option value="string">String</option>
                        <option value="boolean">Boolean</option>
                        <option value="int">Integer</option>
                        <option value="float">Float</option>
                        <option value="double">Double</option>
                      </select>
                    </div>

                    {/* Additional fields based on service type */}
                    {point.register_type && (
                      <div className="form-field">
                        <label htmlFor={`point-register-${index}`}>Register Type</label>
                        <select
                          id={`point-register-${index}`}
                          value={point.register_type || 'holding_register'}
                          onChange={(e) => handleDataPointChange(index, 'register_type', e.target.value)}
                          className="form-select"
                        >
                          <option value="holding_register">Holding Register</option>
                          <option value="input_register">Input Register</option>
                          <option value="coil">Coil</option>
                          <option value="discrete_input">Discrete Input</option>
                        </select>
                      </div>
                    )}

                    {point.address !== undefined && (
                      <div className="form-field">
                        <label htmlFor={`point-address-${index}`}>Address</label>
                        <input
                          id={`point-address-${index}`}
                          type="number"
                          value={point.address || 0}
                          onChange={(e) => handleDataPointChange(index, 'address', parseInt(e.target.value) || 0)}
                          min="0"
                          max="65535"
                          className="form-input"
                        />
                      </div>
                    )}

                    {point.data_type && (
                      <div className="form-field">
                        <label htmlFor={`point-data-type-${index}`}>Data Type</label>
                        <select
                          id={`point-data-type-${index}`}
                          value={point.data_type || 'int'}
                          onChange={(e) => handleDataPointChange(index, 'data_type', e.target.value)}
                          className="form-select"
                        >
                          <option value="int">Integer</option>
                          <option value="float">Float</option>
                          <option value="double">Double</option>
                          <option value="boolean">Boolean</option>
                          <option value="string">String</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data-points">
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No Data Points</h3>
                <p>No data points configured yet. Click "Add Data Point" to create one.</p>
                <button className="btn btn-primary" onClick={addDataPoint}>
                  Add Your First Data Point
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="config-section">
          <div className="section-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="quick-actions">
            <button className="btn btn-outline" onClick={addDataPoint}>
              + Add Multiple Data Points
            </button>
            <button className="btn btn-outline" onClick={() => {
              if (currentService.data_points && currentService.data_points.length > 0) {
                const clearedService = {
                  ...currentService,
                  data_points: []
                };
                setCurrentService(clearedService);
              }
            }}>
              Clear All Data Points
            </button>
          </div>
        </div>

        {/* JSON View */}
        <div className="config-section">
          <div className="section-header">
            <h2>Service JSON</h2>
            <p className="section-description">Current service configuration</p>
          </div>
          <div className="json-viewer">
            <pre className="json-content">
              {JSON.stringify(currentService, null, 2)}
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