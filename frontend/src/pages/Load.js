
// pages/Load.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import LoadMetrics from '../components/Load/LoadMetrics';
import Filter from '../components/Filter';
import LoadChart from '../components/Load/LoadChart';
import LoadTable from '../components/Load/LoadTable';
import ConnectionStatus from '../components/Demo/ConnectionStatus';
import DemoControls from '../components/Demo/DemoControls';

const Load = () => {
  const [filters, setFilters] = useState({
    crane: 'all',
    status: 'all',
    date: 'today'
  });
  const [metrics, setMetrics] = useState({
    currentLoad: '0 kg',
    averageCapacity: '0%',
    maxCapacity: '0 kg',
    overallStatus: 'No Data'
  });
  const [loadData, setLoadData] = useState([]);
  const [filteredLoadData, setFilteredLoadData] = useState([]);
  const [showChart, setShowChart] = useState(false);

  // Mode and connection states
  const [mode, setMode] = useState('polling');
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(1000);
  const [apiStatus, setApiStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const ws = useRef(null);
  const pollingRef = useRef(null);

  // Filter configuration for Load page
  const filterConfig = [
    {
      key: 'crane',
      label: 'Crane',
      type: 'select',
      value: filters.crane,
      options: [
        { value: 'all', label: 'All Cranes' },
        { value: 'CRN-001', label: 'Gantry Crane #1 (CRN-001)' },
        { value: 'CRN-002', label: 'Overhead Crane #2 (CRN-002)' },
        { value: 'CRN-003', label: 'Jib Crane #3 (CRN-003)' },
        { value: 'CRN-004', label: 'Bridge Crane #4 (CRN-004)' },
        { value: 'CRN-005', label: 'Gantry Crane #5 (CRN-005)' }
      ]
    },
    {
      key: 'status',
      label: 'Load Status',
      type: 'select',
      value: filters.status,
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'normal', label: 'Normal' },
        { value: 'warning', label: 'Warning (80-95%)' },
        { value: 'overload', label: 'Overload (>95%)' }
      ]
    },
    {
      key: 'date',
      label: 'Date Range',
      type: 'select',
      value: filters.date,
      options: [
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
        { value: 'all', label: 'All Dates' }
      ]
    }
  ];

  // Process LoadCell service data
  const processLoadCellData = useCallback((serviceArray) => {
    const loadReadings = {};
    let timestamp = new Date().toISOString();

    // Find LoadCell service
    const loadCellService = serviceArray.find(service => service.name === 'LoadCell');
    if (loadCellService) {
      loadCellService.assets.forEach(asset => {
        const { id, value, timestamp: assetTimestamp } = asset;
        
        // Map datapoints to our load metrics
        switch(id) {
          case 'Load':
            loadReadings.currentLoad = parseFloat(value) || 0;
            break;
          case 'Load_Capacity':
            loadReadings.capacity = parseFloat(value) || 10000; // Default 10,000 kg if not provided
            break;
          case 'Load_Swing_Angle':
            loadReadings.swingAngle = parseFloat(value) || 0;
            break;
        }
        
        if (assetTimestamp) {
          timestamp = assetTimestamp;
        }
      });
    }

    return { loadReadings, timestamp };
  }, []);

  // Update metrics based on current load readings
  const updateMetrics = useCallback((loadReadings, historicalData = []) => {
    const {
      currentLoad = 0,
      capacity = 10000,
      swingAngle = 0
    } = loadReadings;

    // Calculate load percentage
    const loadPercentage = capacity > 0 ? (currentLoad / capacity) * 100 : 0;

    // Determine overall status
    let overallStatus = 'No Data';
    if (currentLoad > 0) {
      if (loadPercentage > 95) {
        overallStatus = 'Overload Detected';
      } else if (loadPercentage > 80) {
        overallStatus = 'High Load Warning';
      } else {
        overallStatus = 'Normal';
      }
    }

    // Calculate average capacity from historical data
    const avgCapacity = historicalData.length > 0 
      ? historicalData.reduce((sum, item) => sum + item.percentage, 0) / historicalData.length
      : 0;

    // Find maximum load from historical data
    const maxLoad = historicalData.length > 0
      ? Math.max(...historicalData.map(item => item.load))
      : currentLoad;

    setMetrics({
      currentLoad: `${currentLoad.toLocaleString()} kg`,
      averageCapacity: `${avgCapacity.toFixed(0)}%`,
      maxCapacity: `${maxLoad.toLocaleString()} kg`,
      overallStatus: overallStatus
    });
  }, []);

  // Create load data record for table
  const createLoadRecord = useCallback((loadReadings, timestamp) => {
    const {
      currentLoad = 0,
      capacity = 10000,
      swingAngle = 0
    } = loadReadings;

    // Calculate load percentage
    const loadPercentage = capacity > 0 ? (currentLoad / capacity) * 100 : 0;

    // Determine status based on load percentage
    let status = 'normal';
    let operation = 'Idle';

    if (currentLoad > 0) {
      if (loadPercentage > 95) {
        status = 'overload';
        operation = 'Overload Alert';
      } else if (loadPercentage > 80) {
        status = 'warning';
        operation = 'High Load';
      } else if (currentLoad > 0) {
        status = 'normal';
        operation = swingAngle > 10 ? 'Swinging Load' : 'Static Load';
      }
    }

    // Only create record if there's actual load or significant swing
    if (currentLoad > 0 || Math.abs(swingAngle) > 5) {
      return {
        id: `${timestamp}_load_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(timestamp).toLocaleString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),?/, '$3-$1-$2'),
        craneId: 'CRN-001', // Default crane, can be enhanced
        operation: operation,
        load: parseFloat(currentLoad.toFixed(0)),
        capacity: parseFloat(capacity.toFixed(0)),
        percentage: parseFloat(loadPercentage.toFixed(1)),
        swingAngle: parseFloat(swingAngle.toFixed(1)),
        status: status
      };
    }

    return null;
  }, []);

  // Enhanced polling function
  const fetchData = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/iot-data');
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          let services = [];

          // Handle different data formats
          if (result.data.services && Array.isArray(result.data.services)) {
            services = result.data.services;
          } else if (Array.isArray(result.data)) {
            services = result.data;
          }

          // Filter to only use LoadCell service
          const filteredServices = services.filter(service => 
            service.name === 'LoadCell'
          );

          if (filteredServices.length > 0) {
            // Process LoadCell data and extract load readings
            const { loadReadings, timestamp } = processLoadCellData(filteredServices);

            // Create load data record for table
            const newLoadRecord = createLoadRecord(loadReadings, timestamp);

            if (newLoadRecord) {
              // Update load data (keep last 100 records like OperationsLog)
              setLoadData(prev => {
                const updatedData = [newLoadRecord, ...prev].slice(0, 100);
                // Update metrics with current readings and historical data
                updateMetrics(loadReadings, updatedData);
                return updatedData;
              });
            } else {
              // Update metrics even if no new record (for current load display)
              updateMetrics(loadReadings, loadData);
            }

            setApiStatus(`${mode === 'polling' ? 'Polling' : 'Realtime'} - LoadCell service active`);
          } else {
            setApiStatus('No LoadCell service data available');
          }

          setLastUpdate(new Date());
          setIsConnected(true);
        } else {
          setApiStatus('Error: API returned unsuccessful response');
          setIsConnected(false);
        }
      } else {
        setApiStatus(`HTTP Error: ${response.status}`);
        setIsConnected(false);
      }
    } catch (error) {
      setApiStatus(`Connection Error: ${error.message}`);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, mode, processLoadCellData, createLoadRecord, updateMetrics, loadData]);

  // WebSocket connection for realtime mode
  const connectWebSocket = useCallback(() => {
    try {
      setApiStatus('Connecting to WebSocket...');
      
      // Simulate WebSocket with rapid polling for service data
      setIsConnected(true);
      setApiStatus('Simulated WebSocket - LoadCell Data');
      
      fetchData(); // Initial fetch
      pollingRef.current = setInterval(fetchData, 500);
      
    } catch (error) {
      setIsConnected(false);
      setApiStatus('WebSocket setup error - Falling back to polling');
      setMode('polling');
    }
  }, [fetchData]);

  // Method switching effect
  useEffect(() => {
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
  }, [mode, pollingInterval, fetchData, connectWebSocket]);

  // Apply filters to load data
  const applyFiltersToData = useCallback((data, currentFilters) => {
    let filtered = [...data];

    // Apply crane filter
    if (currentFilters.crane !== 'all') {
      filtered = filtered.filter(item => item.craneId === currentFilters.crane);
    }

    // Apply status filter
    if (currentFilters.status !== 'all') {
      filtered = filtered.filter(item => item.status === currentFilters.status);
    }

    // Apply date filter (simplified implementation)
    if (currentFilters.date !== 'all') {
      const now = new Date();
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.timestamp);
        switch(currentFilters.date) {
          case 'today':
            return itemDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return itemDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return itemDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, []);

  // Handle mode change
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  // Handle interval change
  const handleIntervalChange = useCallback((interval) => {
    setPollingInterval(interval);
  }, []);

  // Manual refresh
  const handleManualRefresh = useCallback(() => {
    if (mode === 'polling') {
      setApiStatus('Manual refresh...');
      fetchData();
    }
  }, [mode, fetchData]);

  const handleFilterChange = useCallback((filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    console.log('Applying filters:', filters);
    const filteredData = applyFiltersToData(loadData, filters);
    setFilteredLoadData(filteredData);
    setShowChart(true);
  }, [filters, loadData, applyFiltersToData]);

  const handleResetFilters = useCallback(() => {
    setFilters({
      crane: 'all',
      status: 'all',
      date: 'today'
    });
    setFilteredLoadData(loadData);
    setShowChart(false);
  }, [loadData]);

  // Update filtered data when loadData changes
  useEffect(() => {
    if (!showChart) {
      setFilteredLoadData(loadData);
    }
  }, [loadData, showChart]);

  return (
    <>
      <div className="page-title">
        <h1>Load Lift Log</h1>
        <p>Real-time load monitoring from LoadCell service</p>
      </div>

      <ConnectionStatus 
        mode={mode}
        isConnected={isConnected}
        lastUpdate={lastUpdate}
        onManualRefresh={handleManualRefresh}
        apiStatus={apiStatus}
      />

      <DemoControls 
        mode={mode}
        pollingInterval={pollingInterval}
        onModeChange={handleModeChange}
        onIntervalChange={handleIntervalChange}
      />

      <LoadMetrics metrics={metrics} />

      <Filter 
        filters={filterConfig}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />

      {showChart && <LoadChart loadData={filteredLoadData} />}

      <LoadTable loadData={filteredLoadData.length > 0 ? filteredLoadData : loadData} />
    </>
  );
};

export default Load;
