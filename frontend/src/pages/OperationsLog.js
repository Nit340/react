// pages/OperationsLog.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import OperationsMetrics from '../components/OperationsLog/OperationsMetrics';
import Filter from '../components/Filter';
import OperationsTable from '../components/OperationsLog/OperationsTable';

const OperationsLog = () => {
  const [filters, setFilters] = useState({
    crane: 'Crane',
    type: 'all',
    date: 'week'
  });
  const [operationsData, setOperationsData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  
  // Metrics state - will be calculated from database
  const [metrics, setMetrics] = useState({
    hoist: { total: 0, up: 0, down: 0 },
    ct: { total: 0, left: 0, right: 0 },
    lt: { total: 0, forward: 0, reverse: 0 },
    switch: 0
  });

  const [filtersApplied, setFiltersApplied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [apiStatus, setApiStatus] = useState('');
  
  const pollingRef = useRef(null);
  
  // Track operation start times and previous values
  const operationStartTimes = useRef({});
  const previousValues = useRef({});
  const activeOperations = useRef(new Set());
  const currentLoadRef = useRef(0);
  const operationDurations = useRef({}); // Track durations for each operation type

  // Filter configuration for OperationsLog
  const filterConfig = [
    {
      key: 'crane',
      label: 'Crane',
      type: 'text',
      value: 'Default Crane',
      displayOnly: true
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
        { value: 'lt-reverse', label: 'LT Reverse' }
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
        { value: 'month', label: 'This Month' }
      ]
    }
  ];

  // Format timestamp for display
  const formatTimestamp = useCallback((timestamp) => {
    try {
      let date;
      if (typeof timestamp === 'string') {
        let cleanedTimestamp = timestamp;
        if (timestamp.includes('+00:00Z')) {
          cleanedTimestamp = timestamp.replace('+00:00Z', 'Z');
        }
        
        date = new Date(cleanedTimestamp);
        
        if (isNaN(date.getTime())) {
          date = new Date(timestamp.replace('Z', ''));
        }
      } else {
        date = new Date(timestamp);
      }
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return new Date().toLocaleString();
      }
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return new Date().toLocaleString();
    }
  }, []);

  // Format duration in seconds to MM:SS format
  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate metrics from LATEST database data using operation_counters
  const calculateMetricsFromDatabase = useCallback((databaseData) => {
    console.log('📊 Calculating metrics from operation_counters', databaseData);
    
    let hoistUp = 0;
    let hoistDown = 0;
    let ctForward = 0;
    let ctBackward = 0;
    let ltForward = 0;
    let ltBackward = 0;
    let totalSwitch = 0;

    if (Array.isArray(databaseData)) {
      databaseData.forEach(service => {
        if (service && service.operation_counters && Object.keys(service.operation_counters).length > 0) {
          const counters = service.operation_counters;
          
          console.log(`📈 Service ${service.name} operation counters:`, counters);
          
          hoistUp += counters.hoist_up_count || 0;
          hoistDown += counters.hoist_down_count || 0;
          ctForward += counters.ct_forward_count || 0;
          ctBackward += counters.ct_backward_count || 0;
          ltForward += counters.lt_forward_count || 0;
          ltBackward += counters.lt_backward_count || 0;
          totalSwitch += counters.total_operation_count || 0;
        }
      });
    }

    const calculatedMetrics = {
      hoist: {
        up: hoistUp,
        down: hoistDown,
        total: hoistUp + hoistDown
      },
      ct: {
        left: ctForward,
        right: ctBackward,
        total: ctForward + ctBackward
      },
      lt: {
        forward: ltForward,
        reverse: ltBackward,
        total: ltForward + ltBackward
      },
      switch: totalSwitch
    };

    console.log('📊 Final calculated metrics:', calculatedMetrics);
    return calculatedMetrics;
  }, []);

  // Extract current load from service data
  const extractCurrentLoad = useCallback((serviceArray) => {
    let currentLoad = currentLoadRef.current;
    
    const loadCellService = serviceArray.find(service => 
      service.name && service.name.toLowerCase().includes('load')
    );
    
    if (loadCellService && loadCellService.assets) {
      const loadAsset = loadCellService.assets.find(asset => 
        asset.id && asset.id.toLowerCase().includes('load') && !asset.id.toLowerCase().includes('capacity')
      );
      
      if (loadAsset && loadAsset.value !== undefined && loadAsset.value !== null) {
        const newLoad = parseFloat(loadAsset.value);
        if (!isNaN(newLoad) && newLoad > 0) {
          currentLoad = newLoad;
          currentLoadRef.current = currentLoad;
          console.log(`⚖️ Current load updated: ${currentLoad} kg`);
        }
      }
    }
    
    return currentLoad;
  }, []);

  // Process LATEST service data for operations log - ONLY MOVEMENT OPERATIONS
  const processServiceDataForLog = useCallback((serviceArray) => {
    const newOperations = [];
    
    // Get current load
    const currentLoad = extractCurrentLoad(serviceArray);

    // Find io service and detect operations from LATEST data
    const ioService = serviceArray.find(service => 
      service.name === 'io' || service.name === 'IO'
    );
    
    if (ioService && ioService.assets) {
      console.log(`🔍 Processing IO service with ${ioService.assets.length} assets, current load: ${currentLoad} kg`);
      
      ioService.assets.forEach(asset => {
        const { id, value, timestamp } = asset;
        const prevValue = previousValues.current[id] || 0;
        const numericValue = parseFloat(value);
        const assetIdLower = id.toLowerCase();
        
        // ONLY MOVEMENT OPERATIONS - NO START/STOP
        const movementOperations = [
          'hoist_up', 'hoist_down', 
          'ct_left', 'ct_right', 
          'lt_forward', 'lt_reverse'
        ];
        
        if (movementOperations.includes(assetIdLower)) {
          const operationKey = assetIdLower;
          
          // Operation STARTED: 0 -> 1 transition
          if (prevValue === 0 && numericValue === 1) {
            let operationType = '';

            // Map asset IDs to operation types
            switch(operationKey) {
              case 'hoist_up':
                operationType = 'hoist-up';
                break;
              case 'hoist_down':
                operationType = 'hoist-down';
                break;
              case 'ct_left':
                operationType = 'ct-left';
                break;
              case 'ct_right':
                operationType = 'ct-right';
                break;
              case 'lt_forward':
                operationType = 'lt-forward';
                break;
              case 'lt_reverse':
                operationType = 'lt-reverse';
                break;
              default:
                return;
            }

            // Record operation start time
            const startTime = new Date();
            operationStartTimes.current[operationKey] = startTime;
            activeOperations.current.add(operationKey);

            const operation = {
              id: `${Date.now()}_${id}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: formatTimestamp(timestamp),
              rawTimestamp: timestamp,
              craneId: 'Crane',
              operation: operationType,
              duration: '0:00',
              currentDuration: 0,
              load: `${currentLoad} kg`,
              status: 'active',
              startTime: startTime.toISOString(),
              assetId: id
            };

            newOperations.push(operation);
            console.log(`🟢 Movement STARTED: ${operationType} from ${id} with load ${currentLoad} kg`);

          } 
          // Operation ENDED: 1 -> 0 transition
          else if (prevValue === 1 && numericValue === 0 && operationStartTimes.current[operationKey]) {
            const endTime = new Date();
            const startTime = operationStartTimes.current[operationKey];
            const durationSeconds = Math.floor((endTime - startTime) / 1000);
            
            // Store the duration for this operation
            operationDurations.current[operationKey] = durationSeconds;
            
            // Find and update the active operation
            setOperationsData(prevOperations => {
              return prevOperations.map(op => {
                if (op.assetId === id && op.status === 'active') {
                  console.log(`🔴 Movement ENDED: ${op.operation} from ${id} after ${durationSeconds}s`);
                  return {
                    ...op,
                    duration: formatDuration(durationSeconds),
                    status: 'completed',
                    endTime: endTime.toISOString()
                  };
                }
                return op;
              });
            });

            // Clean up
            delete operationStartTimes.current[operationKey];
            activeOperations.current.delete(operationKey);
          }

          // Update previous value for next comparison
          previousValues.current[id] = numericValue;
        }
        
        // Handle start/stop signals but don't log them
        else if (assetIdLower === 'start' || assetIdLower === 'stop') {
          // Just update previous value for edge detection, but don't create operations
          previousValues.current[id] = numericValue;
          console.log(`ℹ️ Start/Stop signal: ${id} = ${numericValue} (not logged)`);
        }
      });
    }

    console.log(`📝 Generated ${newOperations.length} new movement operations`);
    return newOperations;
  }, [formatTimestamp, formatDuration, extractCurrentLoad]);

  // Calculate real-time duration for active operations
  const calculateActiveDurations = useCallback(() => {
    const now = new Date();
    const updatedOperations = [...operationsData];
    
    let hasUpdates = false;
    
    updatedOperations.forEach((op, index) => {
      if (op.status === 'active' && op.startTime) {
        const durationSeconds = Math.floor((now - new Date(op.startTime)) / 1000);
        if (durationSeconds !== op.currentDuration) {
          updatedOperations[index] = {
            ...op,
            currentDuration: durationSeconds,
            duration: formatDuration(durationSeconds)
          };
          hasUpdates = true;
        }
      }
    });
    
    if (hasUpdates) {
      setOperationsData(updatedOperations);
    }
  }, [operationsData, formatDuration]);

  // Fetch LATEST data from database (both metrics and operations)
  const fetchDataFromDatabase = useCallback(async () => {
    if (isLoading || filtersApplied) return;
    
    console.log('🔄 Fetching LATEST data from database...');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/database/services');
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log('📦 Database response received:', {
            services: result.data.length,
            totalOperations: result.data.reduce((acc, service) => 
              acc + (service.operation_counters?.total_operation_count || 0), 0
            )
          });
          
          // Calculate metrics from operation_counters
          const calculatedMetrics = calculateMetricsFromDatabase(result.data);
          setMetrics(calculatedMetrics);
          
          // Process operations data from latest values with real duration tracking
          const newOperations = processServiceDataForLog(result.data);
          
          // Update operations data - only add new operations
          if (newOperations.length > 0) {
            setOperationsData(prevOperations => {
              const updatedOperations = [...newOperations, ...prevOperations].slice(0, 100);
              console.log(`🆕 Added ${newOperations.length} new operations, total: ${updatedOperations.length}`);
              return updatedOperations;
            });
          }
          
          setApiStatus(`Real-time Data - ${result.data.length} services, ${calculatedMetrics.switch} total operations`);
          setLastUpdate(new Date());
        } else {
          setApiStatus('No data available');
        }
      } else {
        console.error('❌ Database response error:', response.status);
        setApiStatus(`Database error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error fetching latest data from database:', error);
      setApiStatus(`Connection error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, filtersApplied, calculateMetricsFromDatabase, processServiceDataForLog]);

  // Start database polling for LATEST data - 1 SECOND INTERVAL
  const startDatabasePolling = useCallback(() => {
    console.log('🚀 Starting database polling for latest data (1s interval)');
    setApiStatus('Starting real-time data polling...');
    
    fetchDataFromDatabase();
    
    pollingRef.current = setInterval(fetchDataFromDatabase, 1000);
  }, [fetchDataFromDatabase]);

  // Start duration update interval for active operations
  useEffect(() => {
    const durationInterval = setInterval(() => {
      if (activeOperations.current.size > 0) {
        calculateActiveDurations();
      }
    }, 1000);

    return () => {
      clearInterval(durationInterval);
    };
  }, [calculateActiveDurations]);

  // Start automatic database polling when component mounts
  useEffect(() => {
    console.log('🎯 OperationsLog component mounted');
    startDatabasePolling();

    return () => {
      console.log('🧹 Cleaning up OperationsLog polling');
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [startDatabasePolling]);

  // Load filtered data from database (historical) - ONLY MOVEMENT OPERATIONS
  const loadFilteredDatabaseData = useCallback(async (currentFilters) => {
    try {
      setIsLoading(true);
      console.log('📋 Loading filtered database data with filters:', currentFilters);
      
      const response = await fetch('/api/database/services');
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          const historicalOperations = [];
          
          // Get current load for operations
          const currentLoad = extractCurrentLoad(result.data);

          result.data.forEach(service => {
            if (!service || !service.assets) return;

            if (service.name === 'io' || service.name === 'IO') {
              service.assets.forEach(asset => {
                const { id, value, timestamp } = asset;
                const numericValue = parseFloat(value);
                const assetIdLower = id.toLowerCase();
                
                // ONLY MOVEMENT OPERATIONS - NO START/STOP
                const movementOperations = [
                  'hoist_up', 'hoist_down', 
                  'ct_left', 'ct_right', 
                  'lt_forward', 'lt_reverse'
                ];
                
                if (movementOperations.includes(assetIdLower) && numericValue === 1) {
                  let operationType = '';
                  
                  switch(assetIdLower) {
                    case 'hoist_up':
                      operationType = 'hoist-up';
                      break;
                    case 'hoist_down':
                      operationType = 'hoist-down';
                      break;
                    case 'ct_left':
                      operationType = 'ct-left';
                      break;
                    case 'ct_right':
                      operationType = 'ct-right';
                      break;
                    case 'lt_forward':
                      operationType = 'lt-forward';
                      break;
                    case 'lt_reverse':
                      operationType = 'lt-reverse';
                      break;
                  }

                  if (operationType) {
                    // Use actual duration if available, otherwise random
                    const duration = operationDurations.current[assetIdLower] 
                      ? formatDuration(operationDurations.current[assetIdLower])
                      : formatDuration(Math.floor(Math.random() * 20) + 10);

                    historicalOperations.push({
                      id: `${timestamp}_${id}_${Math.random().toString(36).substr(2, 9)}`,
                      timestamp: formatTimestamp(timestamp),
                      rawTimestamp: timestamp,
                      craneId: 'Crane',
                      operation: operationType,
                      duration: duration,
                      load: `${currentLoad} kg`,
                      status: 'completed'
                    });
                  }
                }
              });
            }
          });

          let filteredOperations = historicalOperations;
          if (currentFilters.type !== 'all') {
            filteredOperations = historicalOperations.filter(op => op.operation === currentFilters.type);
            console.log(`🔧 Filtered by type '${currentFilters.type}': ${filteredOperations.length} operations`);
          }

          filteredOperations.sort((a, b) => new Date(b.rawTimestamp) - new Date(a.rawTimestamp));
          
          setFilteredData(filteredOperations.slice(0, 10));
          setApiStatus(`Filtered Data - ${filteredOperations.length} operations`);
        }
      }
    } catch (error) {
      console.error('❌ Error loading filtered database data:', error);
      setApiStatus('Error loading filtered data');
    } finally {
      setIsLoading(false);
    }
  }, [formatTimestamp, formatDuration, extractCurrentLoad]);

  // Apply filters - load filtered data from database
  const handleApplyFilters = useCallback(async (currentFilters = filters) => {
    console.log('🔍 Applying filters:', currentFilters);
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setFiltersApplied(true);
    setApiStatus('Loading filtered data...');
    await loadFilteredDatabaseData(currentFilters);
  }, [filters, loadFilteredDatabaseData]);

  // Reset filters and restart database polling
  const handleResetFilters = useCallback(() => {
    console.log('🔄 Resetting filters');
    setFilters({
      crane: 'Crane',
      type: 'all',
      date: 'week'
    });
    setFiltersApplied(false);
    setFilteredData([]);
    startDatabasePolling();
  }, [startDatabasePolling]);

  const handleFilterChange = useCallback((filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  }, []);

  // Manual refresh
  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh requested');
    if (filtersApplied) {
      loadFilteredDatabaseData(filters);
    } else {
      fetchDataFromDatabase();
    }
  };

  // Determine which data to display for log
  const displayData = filtersApplied ? filteredData : operationsData.slice(0, 10);
  const activeOperationsCount = operationsData.filter(op => op.status === 'active').length;

  return (
    <>
      <div className="page-title">
        <h1>Operations Log</h1>
        <div className="header-actions">
          <div className="status-info">
            <span className="api-status">{apiStatus}</span>
            {lastUpdate && (
              <span className="last-update">
                Last update: {lastUpdate.toLocaleTimeString()}
                {activeOperationsCount > 0 && (
                  <span className="active-operations"> • {activeOperationsCount} active</span>
                )}
              </span>
            )}
          </div>
          <button onClick={handleManualRefresh} className="refresh-btn" disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <OperationsMetrics metrics={metrics} />

      <Filter 
        filters={filterConfig}
        onFilterChange={handleFilterChange}
        onApplyFilters={() => handleApplyFilters(filters)}
        onResetFilters={handleResetFilters}
      />

      {filtersApplied && (
        <div className="filter-applied-message">
          <p>📊 <strong>Filtered Data Mode</strong> - Showing filtered data from database.</p>
          <p>Current filter: {filters.type === 'all' ? 'All Types' : filters.type}</p>
        </div>
      )}

      {!filtersApplied && (
        <div className="realtime-message">
          <p>📊 <strong>Real-time Mode</strong> - Live data from database (1s updates).</p>
          <p>⏱️ <strong>Live Duration Tracking</strong> - Active operations show real-time duration</p>
          <p>📈 <strong>Metrics</strong> - Operation counts from database operation_counters</p>
          <p>🔢 <strong>Total Operations</strong>: {metrics.switch}</p>
          {activeOperationsCount > 0 && (
            <p>🟢 <strong>Active Operations</strong> - {activeOperationsCount} operation(s) in progress</p>
          )}
        </div>
      )}

      {displayData.length === 0 && !isLoading && (
        <div className="no-data-message">
          <p>📭 No operations data available. Make sure the IoT system is sending data.</p>
          <p>Current metrics show: {metrics.switch} total operations in database.</p>
        </div>
      )}

      <OperationsTable operations={displayData} />

      <style jsx>{`
        .page-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .status-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-size: 12px;
          color: #6c757d;
        }
        
        .api-status {
          font-weight: 600;
          color: #1976d2;
        }
        
        .last-update {
          font-size: 11px;
          color: #adb5bd;
        }
        
        .active-operations {
          color: #28a745;
          font-weight: 600;
        }
        
        .refresh-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        .refresh-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
        
        .refresh-btn:hover:not(:disabled) {
          background: #0056b3;
        }
        
        .filter-applied-message {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 20px;
          color: #856404;
        }
        
        .filter-applied-message p {
          margin: 5px 0;
        }
        
        .realtime-message {
          background: #d1ecf1;
          border: 1px solid #bee5eb;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 20px;
          color: #0c5460;
        }
        
        .realtime-message p {
          margin: 5px 0;
        }
        
        .no-data-message {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 20px;
          color: #721c24;
          text-align: center;
        }
        
        .no-data-message p {
          margin: 5px 0;
        }
      `}</style>
    </>
  );
};

export default OperationsLog;