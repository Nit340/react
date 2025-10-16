// pages/Demo.js
import React, { useState, useEffect, useRef } from 'react';
import DemoMetrics from '../components/Demo/DemoMetrics';
import DemoControls from '../components/Demo/DemoControls';
import ConnectionStatus from '../components/Demo/ConnectionStatus';

const Demo = () => {
  const [mode, setMode] = useState('polling');
  const [data, setData] = useState({});
  const [services, setServices] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(1000);
  const [apiStatus, setApiStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const pollingRef = useRef(null);

  // Ultra-fast data processing - minimal processing for speed
  const processServiceData = (serviceArray) => {
    const timestamp = Date.now();
    
    const processedServices = serviceArray.map(service => ({
      name: service.name,
      assets: service.assets.map(asset => ({
        id: asset.id,
        value: asset.value,
        timestamp: asset.timestamp || timestamp
      }))
    }));

    setServices(processedServices);
    
    // Create flat structure for legacy components
    const flatData = {};
    serviceArray.forEach(service => {
      service.assets.forEach(asset => {
        flatData[asset.id] = asset.value;
      });
    });

    flatData.timestamp = timestamp;
    flatData.source = 'realtime';
    flatData.updateCount = updateCount + 1;
    
    setData(flatData);
    setUpdateCount(prev => prev + 1);
    
    return { services: processedServices, flatData };
  };

  // Ultra-fast polling function - uses your existing endpoint
  const fetchRealtimeData = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Use your existing endpoint with cache prevention
      const response = await fetch('/api/iot-data', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          // Handle service-based data format
          if (result.data.services && Array.isArray(result.data.services)) {
            processServiceData(result.data.services);
            setApiStatus(`Real-time - ${result.data.services.length} services`);
          } else if (Array.isArray(result.data)) {
            processServiceData(result.data);
            setApiStatus(`Real-time - ${result.data.length} services`);
          } else {
            // Direct data assignment for maximum speed
            setData(prev => ({
              ...result.data,
              timestamp: Date.now(),
              source: 'direct_realtime',
              updateCount: updateCount + 1
            }));
            setUpdateCount(prev => prev + 1);
            setApiStatus('Direct Real-time Data');
          }
          
          setLastUpdate(new Date());
          setIsConnected(true);
        } else {
          setApiStatus('No real-time data available');
          setIsConnected(false);
        }
      } else {
        setApiStatus(`HTTP Error: ${response.status}`);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Real-time fetch error:', error);
      setApiStatus(`Connection Error: ${error.message}`);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time mode using very fast polling
  const startRealtimeMode = () => {
    console.log('🚀 Starting real-time mode (fast polling)');
    setApiStatus('Real-time mode - Fast updates');
    
    // Initial fetch
    fetchRealtimeData();
    
    // Fast polling for real-time feel
    pollingRef.current = setInterval(fetchRealtimeData, 300); // 300ms for real-time
  };

  // Method switching effect
  useEffect(() => {
    console.log(`🔄 Switching to ${mode} mode`);
    
    // Cleanup previous connections
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setIsConnected(false);
    setUpdateCount(0);

    if (mode === 'polling') {
      setApiStatus(`Polling - ${pollingInterval}ms interval`);
      fetchRealtimeData(); // Initial fetch
      pollingRef.current = setInterval(fetchRealtimeData, pollingInterval);
    } else if (mode === 'realtime') {
      startRealtimeMode();
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [mode, pollingInterval]);

  // Handle mode change
  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  // Handle interval change - with faster options for real-time
  const handleIntervalChange = (interval) => {
    setPollingInterval(interval);
  };

  // Manual refresh
  const handleManualRefresh = () => {
    setApiStatus('Manual refresh...');
    fetchRealtimeData();
  };

  // Simulate data for testing if no API available
  const simulateRealtimeData = () => {
    const mockServices = [
      {
        name: 'onboardio',
        assets: [
          { id: 'IN0', value: Math.random() > 0.5 ? 1 : 0, timestamp: new Date().toISOString() },
          { id: 'IN1', value: Math.random() > 0.5 ? 1 : 0, timestamp: new Date().toISOString() },
          { id: 'OUT0', value: Math.random() > 0.5 ? 1 : 0, timestamp: new Date().toISOString() },
          { id: 'OUT1', value: Math.random() > 0.5 ? 1 : 0, timestamp: new Date().toISOString() },
        ]
      },
      {
        name: 'loadcell',
        assets: [
          { id: 'Load', value: Math.floor(Math.random() * 1000), timestamp: new Date().toISOString() },
          { id: 'Weight', value: Math.floor(Math.random() * 500), timestamp: new Date().toISOString() },
        ]
      },
      {
        name: 'modbus',
        assets: [
          { id: 'Voltage', value: (Math.random() * 50 + 200).toFixed(1), timestamp: new Date().toISOString() },
          { id: 'Current', value: (Math.random() * 10 + 5).toFixed(1), timestamp: new Date().toISOString() },
        ]
      }
    ];
    
    processServiceData(mockServices);
    setApiStatus('Simulated Real-time Data');
    setLastUpdate(new Date());
    setIsConnected(true);
  };

  return (
    <>
      <div className="page-title">
        <h1>Real-time Monitoring</h1>
        <div className="update-counter">
          Mode: {mode}
        </div>
      </div>

      <ConnectionStatus 
        mode={mode}
        isConnected={isConnected}
        lastUpdate={lastUpdate}
        onManualRefresh={handleManualRefresh}
        apiStatus={apiStatus}
        isLoading={isLoading}
      />

      <DemoControls 
        mode={mode}
        pollingInterval={pollingInterval}
        onModeChange={handleModeChange}
        onIntervalChange={handleIntervalChange}
        onSimulateData={simulateRealtimeData}
      />

      {/* Service-based Data Display */}
      <div className="services-container">
        <div className="services-header">
          <h3>Service Data ({services.length} services)</h3>
          <div className="data-freshness">
            Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
            {lastUpdate && (
              <span className="update-age">
                ({Math.round((Date.now() - lastUpdate.getTime()) / 1000)}s ago)
              </span>
            )}
          </div>
        </div>
        <div className="services-grid">
          {services.map(service => (
            <div key={service.name} className="service-card">
              <div className="service-header">
                <h4>{service.name}</h4>
                <span className="service-asset-count">{service.assets.length} assets</span>
              </div>
              <div className="assets-grid">
                {service.assets.map(asset => (
                  <div key={asset.id} className="asset-item">
                    <div className="asset-id">{asset.id}</div>
                    <div className="asset-value">{asset.value}</div>
                    <div className="asset-timestamp">
                      {new Date(asset.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {services.length === 0 && !isLoading && (
            <div className="no-data">
              No service data available
              <button onClick={simulateRealtimeData} className="simulate-btn">
                Simulate Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Only DemoMetrics remains - DataGrid has been removed */}
      <DemoMetrics data={data} services={services} isLoading={isLoading} />

      <style jsx>{`
        .page-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .update-counter {
          background: #e3f2fd;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          color: #1976d2;
          font-weight: 600;
        }
        
        .services-container {
          margin: 20px 0;
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .services-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .data-freshness {
          font-size: 14px;
          color: #6c757d;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        
        .update-age {
          font-size: 12px;
          color: #adb5bd;
        }
        
        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 15px;
        }
        
        .service-card {
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 15px;
          background: #f8f9fa;
          transition: all 0.3s ease;
        }
        
        .service-card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          transform: translateY(-2px);
        }
        
        .service-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #dee2e6;
        }
        
        .service-header h4 {
          margin: 0;
          text-transform: capitalize;
          color: #2c3e50;
        }
        
        .service-asset-count {
          background: #e3f2fd;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          color: #1976d2;
        }
        
        .assets-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        
        .asset-item {
          padding: 10px;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          text-align: center;
          background: white;
          transition: background-color 0.2s ease;
        }
        
        .asset-item:hover {
          background: #f8f9fa;
        }
        
        .asset-id {
          font-weight: 600;
          font-size: 12px;
          color: #6c757d;
          text-transform: uppercase;
        }
        
        .asset-value {
          font-size: 18px;
          font-weight: 700;
          color: #1976d2;
          margin: 8px 0;
        }
        
        .asset-timestamp {
          font-size: 10px;
          color: #adb5bd;
        }
        
        .no-data {
          grid-column: 1 / -1;
          text-align: center;
          padding: 40px;
          color: #6c757d;
          font-style: italic;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }
        
        .simulate-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .simulate-btn:hover {
          background: #218838;
        }
      `}</style>
    </>
  );
};

export default Demo;