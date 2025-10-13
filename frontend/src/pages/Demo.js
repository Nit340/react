// pages/Demo.js - DEBUG VERSION
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
  
  const pollingRef = useRef(null);
  const eventSourceRef = useRef(null);
  const debugLogRef = useRef([]);

  // Debug logging
  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    debugLogRef.current.push(logEntry);
    console.log(logEntry);
    
    // Keep only last 20 logs
    if (debugLogRef.current.length > 20) {
      debugLogRef.current.shift();
    }
  };

  // Process service-based data structure
  const processServiceData = (serviceArray, source) => {
    addDebugLog(`🔄 Processing ${serviceArray.length} services from ${source}`);
    
    const processedServices = serviceArray.map(service => ({
      name: service.name,
      assets: service.assets.map(asset => ({
        id: asset.id,
        value: asset.value,
        timestamp: asset.timestamp
      }))
    }));

    // Create flat structure for legacy components
    const flatData = {};
    
    processedServices.forEach(service => {
      service.assets.forEach(asset => {
        flatData[asset.id] = asset.value;
      });
    });

    flatData.timestamp = serviceArray[0]?.assets[0]?.timestamp || new Date().toISOString();
    flatData.source = source;
    
    addDebugLog(`✅ Processed to ${processedServices.length} services, ${Object.keys(flatData).length} assets`);
    
    return { services: processedServices, flatData };
  };

  // Enhanced polling function
  const fetchData = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      addDebugLog(`📡 FETCHING from /api/iot-data (mode: ${mode})`);
      const response = await fetch('/api/iot-data');
      
      if (response.ok) {
        const result = await response.json();
        addDebugLog(`📦 GOT RESPONSE: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        
        if (result.success && result.data) {
          if (result.data.services && Array.isArray(result.data.services)) {
            const processed = processServiceData(result.data.services, `polling-${mode}`);
            
            // Check if data actually changed
            const currentValues = services.flatMap(s => s.assets.map(a => a.value)).join(',');
            const newValues = processed.services.flatMap(s => s.assets.map(a => a.value)).join(',');
            
            addDebugLog(`🔍 DATA COMPARISON - Current: [${currentValues}] vs New: [${newValues}]`);
            
            if (currentValues !== newValues) {
              setServices(processed.services);
              setData(processed.flatData);
              setLastUpdate(new Date());
              setIsConnected(true);
              setApiStatus(`Polling - ${result.data.total_services} services`);
              addDebugLog(`🔄 UPDATED DISPLAY with new data`);
            } else {
              addDebugLog(`⏭️ SKIPPED UPDATE - data unchanged`);
            }
          }
        }
      }
    } catch (error) {
      addDebugLog(`❌ FETCH ERROR: ${error.message}`);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // REAL Server-Sent Events (should NOT show polling logs)
  const connectEventSource = () => {
    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        addDebugLog('🔌 Closed previous SSE connection');
      }

      setApiStatus('🔄 Connecting to REAL-TIME stream...');
      addDebugLog('🚀 STARTING REAL SSE CONNECTION to /api/stream-iot-data');
      
      eventSourceRef.current = new EventSource('/api/stream-iot-data');
      
      eventSourceRef.current.onopen = () => {
        addDebugLog('✅ SSE CONNECTION OPENED - Real-time mode active');
        setApiStatus('✅ Real-time stream connected');
        setIsConnected(true);
      };
      
      eventSourceRef.current.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data);
          addDebugLog(`📨 SSE MESSAGE RECEIVED: ${result.type || 'data'}`);
          
          if (result.services) {
            const processed = processServiceData(result.services, 'sse-realtime');
            setServices(processed.services);
            setData(processed.flatData);
            setLastUpdate(new Date());
            setApiStatus(`📊 Real-time: ${processed.services.length} services`);
            addDebugLog(`🔄 SSE UPDATED DISPLAY`);
          }
        } catch (e) {
          addDebugLog(`❌ SSE PARSE ERROR: ${e.message}`);
        }
      };
      
      eventSourceRef.current.onerror = (error) => {
        addDebugLog(`❌ SSE ERROR: ${error}`);
        setApiStatus('❌ Real-time stream error');
        setIsConnected(false);
      };
      
    } catch (error) {
      addDebugLog(`❌ SSE SETUP FAILED: ${error.message}`);
      setApiStatus('❌ SSE setup failed');
    }
  };

  // WebSocket mode (fast polling - should show as websocket in logs)
  const connectWebSocket = () => {
    try {
      addDebugLog('🚀 STARTING WEBSOCKET MODE (fast polling)');
      setApiStatus('📡 WebSocket mode (fast polling)');
      setIsConnected(true);
      
      fetchData();
      pollingRef.current = setInterval(fetchData, 500);
      
    } catch (error) {
      addDebugLog(`❌ WEBSOCKET SETUP FAILED: ${error.message}`);
      setMode('polling');
    }
  };

  // Method switching effect
  useEffect(() => {
    addDebugLog(`🔄 SWITCHING MODE to: ${mode}`);
    
    // Cleanup previous connections
    if (pollingRef.current) {
      addDebugLog('🛑 CLEARING polling interval');
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    if (eventSourceRef.current) {
      addDebugLog('🛑 CLOSING SSE connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);

    switch (mode) {
      case 'polling':
        addDebugLog('🎯 STARTING PURE POLLING MODE');
        setApiStatus(`🔄 Polling mode - ${pollingInterval}ms`);
        fetchData();
        pollingRef.current = setInterval(fetchData, pollingInterval);
        break;
        
      case 'realtime':
        addDebugLog('🎯 STARTING PURE SSE/REALTIME MODE (NO POLLING)');
        connectEventSource();
        break;
        
      case 'websocket':
        addDebugLog('🎯 STARTING WEBSOCKET MODE (fast polling)');
        connectWebSocket();
        break;
    }

    return () => {
      addDebugLog('🧹 CLEANUP - stopping all connections');
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [mode, pollingInterval]);

  const handleModeChange = (newMode) => {
    addDebugLog(`👆 USER CHANGED MODE to: ${newMode}`);
    setMode(newMode);
  };

  const handleIntervalChange = (interval) => {
    setPollingInterval(interval);
  };

  const handleManualRefresh = () => {
    addDebugLog('👆 MANUAL REFRESH triggered');
    fetchData();
  };

  return (
    <>
      <div className="page-title">
        <h1>IoT Data Demo - DEBUG MODE</h1>
        <p>Checking realtime vs polling behavior</p>
        
        {/* Debug panel */}
        <div style={{
          background: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '5px', 
          marginTop: '10px',
          fontSize: '12px',
          maxHeight: '150px',
          overflowY: 'auto'
        }}>
          <strong>Debug Logs:</strong>
          {debugLogRef.current.slice(-8).map((log, index) => (
            <div key={index} style={{fontFamily: 'monospace', margin: '2px 0'}}>
              {log}
            </div>
          ))}
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
      />

      {/* Service-based Data Display */}
      <div className="services-container">
        <h3>Service Data ({services.length} services) - Mode: {mode}</h3>
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