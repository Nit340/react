// pages/Demo.js
import React, { useState, useEffect, useRef } from 'react';
import DemoMetrics from '../components/Demo/DemoMetrics';
import DemoControls from '../components/Demo/DemoControls';
import DataGrid from '../components/Demo/DataGrid';
import ConnectionStatus from '../components/Demo/ConnectionStatus';

const Demo = () => {
  const [mode, setMode] = useState('polling');
  const [data, setData] = useState({});
  const [services, setServices] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(2000);
  const [apiStatus, setApiStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const ws = useRef(null);
  const pollingRef = useRef(null);

  // Process service-based data structure
  const processServiceData = (serviceArray) => {
    console.log('🔄 Processing service data:', serviceArray);
    
    const processedServices = serviceArray.map(service => ({
      name: service.name,
      assets: service.assets.map(asset => ({
        id: asset.id,
        value: asset.value,
        timestamp: asset.timestamp
      }))
    }));

    setServices(processedServices);
    
    // Create flat structure for legacy components
    const flatData = {};
    
    // Map service assets to flat data structure
    serviceArray.forEach(service => {
      service.assets.forEach(asset => {
        flatData[asset.id] = asset.value;
      });
    });

    // Add timestamp and source
    flatData.timestamp = serviceArray[0]?.assets[0]?.timestamp || new Date().toISOString();
    flatData.source = 'service_data';
    
    console.log('✅ Processed services:', processedServices);
    console.log('✅ Flat data:', flatData);
    
    setData(flatData);
    return { services: processedServices, flatData };
  };

  // Enhanced polling function
  const fetchData = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log('🔄 Polling: Fetching data from /api/iot-data...');
      const response = await fetch('/api/iot-data');
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Full API Response:', result);
        
        if (result.success && result.data) {
          // Handle the nested service data structure
          if (result.data.services && Array.isArray(result.data.services)) {
            // New service format with nested services array
            const processed = processServiceData(result.data.services);
            setApiStatus(`Service Data - ${result.data.total_services} services, ${result.data.total_assets} assets`);
          } else if (Array.isArray(result.data)) {
            // Direct array of services
            const processed = processServiceData(result.data);
            setApiStatus(`Service Data - ${processed.services.length} services`);
          } else {
            // Old flat format
            console.log('⚠️ Using old flat data format');
            setData(result.data);
            setApiStatus(`Legacy Data - Source: ${result.source}`);
          }
          setLastUpdate(new Date());
          setIsConnected(true);
        } else {
          console.error('API returned unsuccessful response:', result);
          setApiStatus('Error: API returned unsuccessful response');
          setIsConnected(false);
        }
      } else {
        console.error('HTTP error:', response.status);
        setApiStatus(`HTTP Error: ${response.status}`);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Polling Error:', error);
      setApiStatus(`Connection Error: ${error.message}`);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // WebSocket connection
  const connectWebSocket = () => {
    try {
      setApiStatus('Connecting to WebSocket...');
      
      // Simulate WebSocket with rapid polling for service data
      console.log('🔄 Using simulated WebSocket mode');
      
      setIsConnected(true);
      setApiStatus('Simulated WebSocket - Service Data');
      
      fetchData(); // Initial fetch
      pollingRef.current = setInterval(fetchData, 500);
      
    } catch (error) {
      console.error('WebSocket setup error:', error);
      setIsConnected(false);
      setApiStatus('WebSocket setup error - Falling back to polling');
      setMode('polling');
    }
  };

  // Method switching effect
  useEffect(() => {
    console.log(`🔄 Switching to ${mode} mode`);
    
    // Cleanup previous connections
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setIsConnected(false);
    setApiStatus(`Initializing ${mode} mode...`);

    if (mode === 'polling') {
      fetchData();
      pollingRef.current = setInterval(fetchData, pollingInterval);
      setApiStatus(`Polling active - ${pollingInterval/1000}s interval`);
    } else if (mode === 'realtime') {
      connectWebSocket();
    }

    return () => {
      if (ws.current) ws.current.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [mode, pollingInterval]);

  // Handle mode change
  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  // Handle interval change
  const handleIntervalChange = (interval) => {
    setPollingInterval(interval);
  };

  // Manual refresh
  const handleManualRefresh = () => {
    if (mode === 'polling') {
      setApiStatus('Manual refresh...');
      fetchData();
    }
  };

  return (
    <>
      <div className="page-title">
        <h1>Real-time monitoring </h1>
      
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
      />

      {/* Service-based Data Display */}
      <div className="services-container">
        <h3>Service Data ({services.length} services)</h3>
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
            <div className="no-data">No service data available</div>
          )}
        </div>
      </div>

      <DemoMetrics data={data} services={services} isLoading={isLoading} />

      <DataGrid data={data} services={services} isLoading={isLoading} />

      <style jsx>{`
        .services-container {
          margin: 20px 0;
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
        }
      `}</style>
    </>
  );
};

export default Demo;