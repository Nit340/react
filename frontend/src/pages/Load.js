// pages/Load.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import LoadMetrics from '../components/Load/LoadMetrics';
import Filter from '../components/Filter';
import LoadChart from '../components/Load/LoadChart';
import LoadTable from '../components/Load/LoadTable';
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

  // Mode state
  const [mode, setMode] = useState('polling');
  const [pollingInterval, setPollingInterval] = useState(1000);
  const [isLoading, setIsLoading] = useState(false);
  
  const ws = useRef(null);
  const pollingRef = useRef(null);

  // Track previous values for onboard_io operations (EXACTLY like OperationsLog)
  const previousValues = useRef({
    Hoist_Up: 0,
    Hoist_Down: 0,
    Ct_Left: 0,
    Ct_Right: 0,
    Lt_Forward: 0,
    Lt_Reverse: 0
  });

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

  // Process LoadCell service data for metrics only
  const processLoadCellData = useCallback((serviceArray) => {
    const loadReadings = {
      currentLoad: 0,
      capacity: 10000,
      swingAngle: 0
    };

    // Find LoadCell service
    const loadCellService = serviceArray.find(service => service.name === 'LoadCell');
    if (loadCellService) {
      loadCellService.assets.forEach(asset => {
        const { id, value } = asset;
        
        switch(id) {
          case 'Load':
            loadReadings.currentLoad = parseFloat(value) || 0;
            break;
          case 'Load_Capacity':
            loadReadings.capacity = parseFloat(value) || 10000;
            break;
          case 'Load_Swing_Angle':
            loadReadings.swingAngle = parseFloat(value) || 0;
            break;
        }
      });
    }

    return loadReadings;
  }, []);

  // Process onboard_io service data for operations (EXACTLY like OperationsLog)
  const processOnboardIOData = useCallback((serviceArray, currentLoad = 0, capacity = 10000) => {
    const newOperations = [];
    let timestamp = new Date().toISOString();

    // Find onboard_io service and detect operations
    const onboardIOService = serviceArray.find(service => service.name === 'onboard_io');
    if (onboardIOService) {
      onboardIOService.assets.forEach(asset => {
        const { id, value, timestamp: assetTimestamp } = asset;
        const prevValue = previousValues.current[id] || 0;

        // Only process the specific datapoints we care about
        const operationDatapoints = ['Hoist_Up', 'Hoist_Down', 'Ct_Left', 'Ct_Right', 'Lt_Forward', 'Lt_Reverse'];
        
        if (operationDatapoints.includes(id)) {
          // Detect operation triggers (edge detection: 0 -> 1) - SAME AS OPERATIONSLOG
          if (prevValue === 0 && value === 1) {
            let operationType = '';
            let craneId = 'CRN-001';

            // Map datapoint to operation type - SAME AS OPERATIONSLOG
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

            // Calculate load percentage for this operation
            const loadPercentage = capacity > 0 ? (currentLoad / capacity) * 100 : 0;
            
            // Determine status based on load percentage
            let status = 'normal';
            if (currentLoad > 0) {
              if (loadPercentage > 95) {
                status = 'overload';
              } else if (loadPercentage > 80) {
                status = 'warning';
              } else {
                status = 'normal';
              }
            }

            if (assetTimestamp) {
              timestamp = assetTimestamp;
            }

            // Create operation record - SIMPLIFIED VERSION
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
              load: parseFloat(currentLoad.toFixed(0)),
              capacity: parseFloat(capacity.toFixed(0)),
              percentage: parseFloat(loadPercentage.toFixed(1)),
              status: status
            };

            newOperations.push(operation);
          }

          // Update previous value
          previousValues.current[id] = value;
        }
      });
    }

    return newOperations;
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

          // Use both LoadCell and onboard_io services
          const filteredServices = services.filter(service => 
            service.name === 'LoadCell' || service.name === 'onboard_io'
          );

          if (filteredServices.length > 0) {
            // Process LoadCell data for current load metrics
            const loadReadings = processLoadCellData(filteredServices);
            const currentLoad = loadReadings.currentLoad || 0;
            const capacity = loadReadings.capacity || 10000;

            // Process onboard_io data for operations (ONLY onboard_io, no created events)
            const newOperations = processOnboardIOData(filteredServices, currentLoad, capacity);

            if (newOperations.length > 0) {
              // Update load data - keep last 100 records
              setLoadData(prev => {
                const updatedData = [...newOperations, ...prev].slice(0, 100);
                // Update metrics with current readings and historical data
                updateMetrics(loadReadings, updatedData);
                return updatedData;
              });
            } else {
              // Update metrics even if no new operations (for current load display)
              updateMetrics(loadReadings, loadData);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, processLoadCellData, processOnboardIOData, updateMetrics, loadData]);

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
        <p>Real-time load monitoring during crane operations from onboard_io service</p>
      </div>

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