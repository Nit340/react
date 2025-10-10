// pages/OperationsLog.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import OperationsMetrics from '../components/OperationsLog/OperationsMetrics';
import Filter from '../components/Filter';
import OperationsTable from '../components/OperationsLog/OperationsTable';
import DemoControls from '../components/Demo/DemoControls';

const OperationsLog = () => {
  const [filters, setFilters] = useState({
    crane: 'all',
    type: 'all',
    date: 'all'
  });
  const [operationsData, setOperationsData] = useState([]);
  const [metrics, setMetrics] = useState({
    hoist: { total: 0, up: 0, down: 0 },
    ct: { total: 0, left: 0, right: 0 },
    lt: { total: 0, forward: 0, reverse: 0 },
    switch: 0,
    duration: '0:00:00',
    load: '0T'
  });

  // Mode state
  const [mode, setMode] = useState('polling');
  const [pollingInterval, setPollingInterval] = useState(1000);
  const [isLoading, setIsLoading] = useState(false);
  
  const ws = useRef(null);
  const pollingRef = useRef(null);

  // Track previous values to detect operations
  const previousValues = useRef({
    Hoist_Up: 0,
    Hoist_Down: 0,
    Ct_Left: 0,
    Ct_Right: 0,
    Lt_Forward: 0,
    Lt_Reverse: 0,
    Load: 0
  });

  // Filter configuration for OperationsLog
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
      key: 'type',
      label: 'Operation Type',
      type: 'select',
      value: filters.type,
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'hoist-up', label: 'Hoist Up' },
        { value: 'hoist-down', label: 'Hoist Down' },
        { value: 'ct-left', label: 'CT Left' },
        { value: 'ct-right', label: 'CT Right' },
        { value: 'lt-forward', label: 'LT Forward' },
        { value: 'lt-reverse', label: 'LT Reverse' },
        { value: 'switch', label: 'Switching' }
      ]
    },
    {
      key: 'date',
      label: 'Date Range',
      type: 'select',
      value: filters.date,
      options: [
        { value: 'all', label: 'All Dates' },
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' }
      ]
    }
  ];

  // Update metrics using the latest operations data
  const updateMetrics = useCallback((data, currentLoad = 0) => {
    const hoist = {
      up: data.filter(op => op.operation === 'hoist-up').length,
      down: data.filter(op => op.operation === 'hoist-down').length,
    };
    hoist.total = hoist.up + hoist.down;

    const ct = {
      left: data.filter(op => op.operation === 'ct-left').length,
      right: data.filter(op => op.operation === 'ct-right').length,
    };
    ct.total = ct.left + ct.right;

    const lt = {
      forward: data.filter(op => op.operation === 'lt-forward').length,
      reverse: data.filter(op => op.operation === 'lt-reverse').length,
    };
    lt.total = lt.forward + lt.reverse;

    // Calculate duration based on operation count
    const totalMinutes = data.length * 0.25;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.floor((totalMinutes * 60) % 60);
    const duration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Use current load if provided, otherwise use latest operation load
    let loadValue = currentLoad;
    if (loadValue === 0 && data.length > 0) {
      const latestLoad = data[0].load;
      loadValue = parseFloat(latestLoad.replace(/,/g, '')) || 0;
    }

    setMetrics({
      hoist,
      ct,
      lt,
      switch: 0,
      duration,
      load: `${loadValue.toLocaleString()}T`
    });
  }, []);

  // Process service data and extract operations
  const processServiceData = useCallback((serviceArray) => {
    const newOperations = [];
    let currentLoad = 0;

    // Find LoadCell service and get current load
    const loadCellService = serviceArray.find(service => service.name === 'LoadCell');
    if (loadCellService) {
      const loadAsset = loadCellService.assets.find(asset => asset.id === 'Load');
      if (loadAsset) {
        currentLoad = parseFloat(loadAsset.value) || 0;
      }
    }

    // Find onboard_io service and detect operations
    const onboardIOService = serviceArray.find(service => service.name === 'onboard_io');
    if (onboardIOService) {
      onboardIOService.assets.forEach(asset => {
        const { id, value, timestamp } = asset;
        const prevValue = previousValues.current[id] || 0;

        // Only process the specific datapoints we care about
        const operationDatapoints = ['Hoist_Up', 'Hoist_Down', 'Ct_Left', 'Ct_Right', 'Lt_Forward', 'Lt_Reverse'];
        
        if (operationDatapoints.includes(id)) {
          // Detect operation triggers (edge detection: 0 -> 1)
          if (prevValue === 0 && value === 1) {
            let operationType = '';
            let craneId = 'CRN-001';

            // Map datapoint to operation type
            switch(id) {
              case 'Hoist_Up':
                operationType = 'hoist-up';
                break;
              case 'Hoist_Down':
                operationType = 'hoist-down';
                break;
              case 'Ct_Left':
                operationType = 'ct-left';
                break;
              case 'Ct_Right':
                operationType = 'ct-right';
                break;
              case 'Lt_Forward':
                operationType = 'lt-forward';
                break;
              case 'Lt_Reverse':
                operationType = 'lt-reverse';
                break;
              default:
                return;
            }

            // Create operation record
            const operation = {
              id: `${timestamp}_${id}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date(timestamp).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              }).replace(/(\d+)\/(\d+)\/(\d+),?/, '$3-$1-$2'),
              craneId: craneId,
              operation: operationType,
              duration: '0:15',
              load: currentLoad.toLocaleString()
            };

            newOperations.push(operation);
          }

          // Update previous value
          previousValues.current[id] = value;
        }
      });
    }

    return { newOperations, currentLoad };
  }, []);

  // Enhanced polling function with proper state handling
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

          // Filter to only use onboard_io and LoadCell services
          const filteredServices = services.filter(service => 
            service.name === 'onboard_io' || service.name === 'LoadCell'
          );

          // Process services and extract operations
          const { newOperations, currentLoad } = processServiceData(filteredServices);

          // Use functional update to get the latest state and update both operations and metrics atomically
          setOperationsData(prevOperations => {
            const updatedOperations = newOperations.length > 0 
              ? [...newOperations, ...prevOperations].slice(0, 100)
              : prevOperations;
            
            // Update metrics with the current data and load
            updateMetrics(updatedOperations, currentLoad);
            
            return updatedOperations;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, processServiceData, updateMetrics]);

  // WebSocket connection for realtime mode
  const connectWebSocket = useCallback(() => {
    try {
      // Simulate WebSocket with rapid polling for service data
      fetchData(); // Initial fetch
      pollingRef.current = setInterval(fetchData, 500);
    } catch (error) {
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

    if (mode === 'polling') {
      fetchData();
      pollingRef.current = setInterval(fetchData, pollingInterval);
    } else if (mode === 'realtime') {
      connectWebSocket();
    }

    return () => {
      if (ws.current) ws.current.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [mode, pollingInterval, fetchData, connectWebSocket]);

  // Handle mode change
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  // Handle interval change
  const handleIntervalChange = useCallback((interval) => {
    setPollingInterval(interval);
  }, []);

  const handleFilterChange = useCallback((filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    console.log('Applying filters:', filters);
    // Filter logic would be implemented here
  }, [filters]);

  const handleResetFilters = useCallback(() => {
    setFilters({
      crane: 'all',
      type: 'all',
      date: 'all'
    });
  }, []);

  return (
    <>
      <div className="page-title">
        <h1>Operations Log</h1>
        <p>Real-time crane operations from onboard_io and LoadCell services</p>
      </div>

      <DemoControls 
        mode={mode}
        pollingInterval={pollingInterval}
        onModeChange={handleModeChange}
        onIntervalChange={handleIntervalChange}
      />

      <OperationsMetrics metrics={metrics} />

      <Filter 
        filters={filterConfig}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />

      <OperationsTable operations={operationsData} />
    </>
  );
};

export default OperationsLog;