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
  
  const pollingRef = useRef(null);
  
  // Track operation start times and previous values
  const operationStartTimes = useRef({});
  const previousValues = useRef({});
  const activeOperations = useRef(new Set());
  const currentLoadRef = useRef(0);
  const operationDurations = useRef({});

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

  // Format timestamp for display - handles database timestamp format
  const formatTimestamp = useCallback((timestamp) => {
    try {
      let date;
      
      if (typeof timestamp === 'string') {
        // Handle database timestamp format: 2024-01-15T10:30:45.123Z
        if (timestamp.includes('T') && timestamp.endsWith('Z')) {
          date = new Date(timestamp);
        } else {
          // Fallback for other formats
          date = new Date(timestamp);
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

    return calculatedMetrics;
  }, []);

  // Extract current load from LoadCell service
  const extractCurrentLoad = useCallback((serviceArray) => {
    let currentLoad = currentLoadRef.current;
    
    // Find LoadCell service
    const loadCellService = serviceArray.find(service => 
      service.name && service.name.toLowerCase().includes('load')
    );
    
    if (loadCellService && loadCellService.assets) {
      // Find load asset (look for assets with 'load' in ID but not 'capacity')
      const loadAsset = loadCellService.assets.find(asset => 
        asset.id && asset.id.toLowerCase().includes('load') && !asset.id.toLowerCase().includes('capacity')
      );
      
      if (loadAsset && loadAsset.value !== undefined && loadAsset.value !== null) {
        const newLoad = parseFloat(loadAsset.value);
        if (!isNaN(newLoad) && newLoad >= 0) {
          currentLoad = newLoad;
          currentLoadRef.current = currentLoad;
          console.log(`📊 Current load updated: ${currentLoad} kg`);
        }
      }
    }
    
    return currentLoad;
  }, []);

  // Process LATEST service data for operations log
  const processServiceDataForLog = useCallback((serviceArray) => {
    const newOperations = [];
    
    // Get current load from LoadCell service
    const currentLoad = extractCurrentLoad(serviceArray);

    // Find io service and detect ACTIVE operations from LATEST data
    const ioService = serviceArray.find(service => 
      service.name === 'io' || service.name === 'IO'
    );
    
    if (ioService && ioService.assets) {
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
              timestamp: formatTimestamp(timestamp), // Use database timestamp
              rawTimestamp: timestamp, // Store original database timestamp
              craneId: 'Crane',
              operation: operationType,
              duration: '0:00',
              currentDuration: 0,
              load: `${currentLoad} kg`,
              status: 'active',
              startTime: startTime.toISOString(), // Real start time for duration calculation
              assetId: id
            };

            newOperations.push(operation);
            console.log(`🚨 Operation STARTED: ${operationType} at ${timestamp}, Load: ${currentLoad}kg`);

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

            console.log(`✅ Operation ENDED: ${operationKey}, Duration: ${durationSeconds}s`);

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
        }
      });
    }

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
    if (filtersApplied) return;
    
    try {
      const response = await fetch('/api/database/services');
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log('📊 Database data received:', result.data);
          
          // Calculate metrics from operation_counters - USE BACKEND COUNTS
          const calculatedMetrics = calculateMetricsFromDatabase(result.data);
          setMetrics(calculatedMetrics);
          
          // Process operations data from latest values with real duration tracking
          const newOperations = processServiceDataForLog(result.data);
          
          // Update operations data - only add new operations
          if (newOperations.length > 0) {
            setOperationsData(prevOperations => {
              const updatedOperations = [...newOperations, ...prevOperations].slice(0, 100);
              return updatedOperations;
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching latest data from database:', error);
    }
  }, [filtersApplied, calculateMetricsFromDatabase, processServiceDataForLog]);

  // HONEST Filter Mode: Create representative operations based on real counts
  const processDatabaseDataForFilteredView = useCallback((databaseData, currentFilters) => {
    const operationsFromDatabase = [];
    
    // Find io service to get real operation counts
    const ioService = databaseData.find(service => 
      service.name === 'io' || service.name === 'IO'
    );
    
    if (ioService && ioService.operation_counters) {
      const counters = ioService.operation_counters;
      
      // Create REPRESENTATIVE operations based on REAL counts
      // But be HONEST that they're not actual historical records
      
      if (counters.hoist_up_count > 0 && (currentFilters.type === 'all' || currentFilters.type === 'hoist-up')) {
        operationsFromDatabase.push({
          id: `hoist-up-rep-${Date.now()}`,
          timestamp: 'Representative data', // HONEST - not real timestamp
          rawTimestamp: new Date().toISOString(),
          craneId: 'Crane',
          operation: 'hoist-up',
          duration: 'N/A',
          load: 'N/A',
          status: 'completed',
          source: 'representative' // HONEST - not actual historical records
        });
      }
      
      if (counters.hoist_down_count > 0 && (currentFilters.type === 'all' || currentFilters.type === 'hoist-down')) {
        operationsFromDatabase.push({
          id: `hoist-down-rep-${Date.now()}`,
          timestamp: 'Representative data',
          rawTimestamp: new Date().toISOString(),
          craneId: 'Crane',
          operation: 'hoist-down',
          duration: 'N/A',
          load: 'N/A',
          status: 'completed',
          source: 'representative'
        });
      }
      
      if (counters.ct_forward_count > 0 && (currentFilters.type === 'all' || currentFilters.type === 'ct-left')) {
        operationsFromDatabase.push({
          id: `ct-left-rep-${Date.now()}`,
          timestamp: 'Representative data',
          rawTimestamp: new Date().toISOString(),
          craneId: 'Crane',
          operation: 'ct-left',
          duration: 'N/A',
          load: 'N/A',
          status: 'completed',
          source: 'representative'
        });
      }
      
      if (counters.ct_backward_count > 0 && (currentFilters.type === 'all' || currentFilters.type === 'ct-right')) {
        operationsFromDatabase.push({
          id: `ct-right-rep-${Date.now()}`,
          timestamp: 'Representative data',
          rawTimestamp: new Date().toISOString(),
          craneId: 'Crane',
          operation: 'ct-right',
          duration: 'N/A',
          load: 'N/A',
          status: 'completed',
          source: 'representative'
        });
      }
      
      if (counters.lt_forward_count > 0 && (currentFilters.type === 'all' || currentFilters.type === 'lt-forward')) {
        operationsFromDatabase.push({
          id: `lt-forward-rep-${Date.now()}`,
          timestamp: 'Representative data',
          rawTimestamp: new Date().toISOString(),
          craneId: 'Crane',
          operation: 'lt-forward',
          duration: 'N/A',
          load: 'N/A',
          status: 'completed',
          source: 'representative'
        });
      }
      
      if (counters.lt_backward_count > 0 && (currentFilters.type === 'all' || currentFilters.type === 'lt-reverse')) {
        operationsFromDatabase.push({
          id: `lt-reverse-rep-${Date.now()}`,
          timestamp: 'Representative data',
          rawTimestamp: new Date().toISOString(),
          craneId: 'Crane',
          operation: 'lt-reverse',
          duration: 'N/A',
          load: 'N/A',
          status: 'completed',
          source: 'representative'
        });
      }
    }
    
    console.log(`📊 Created ${operationsFromDatabase.length} representative operations for filter mode`);
    return operationsFromDatabase;
  }, []);

  // Load filtered data from database - HONEST APPROACH
  const loadFilteredDatabaseData = useCallback(async (currentFilters) => {
    try {
      const response = await fetch('/api/database/services');
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log('🔍 Loading filtered data from database:', result.data);
          
          // For filtered mode, create representative operations based on real counts
          let filteredOperations = [...operationsData];
          
          // Apply type filter if not 'all'
          if (currentFilters.type !== 'all') {
            filteredOperations = operationsData.filter(op => op.operation === currentFilters.type);
          }

          // If we don't have enough real operations, supplement with representative data
          if (filteredOperations.length < 5) {
            const representativeOperations = processDatabaseDataForFilteredView(result.data, currentFilters);
            filteredOperations = [...filteredOperations, ...representativeOperations];
          }

          // Sort by timestamp and limit to 10
          filteredOperations.sort((a, b) => new Date(b.rawTimestamp) - new Date(a.rawTimestamp));
          
          setFilteredData(filteredOperations.slice(0, 10));
        }
      }
    } catch (error) {
      console.error('Error loading filtered database data:', error);
    }
  }, [operationsData, processDatabaseDataForFilteredView]);

  // Start database polling for LATEST data - 1 SECOND INTERVAL
  const startDatabasePolling = useCallback(() => {
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
    startDatabasePolling();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [startDatabasePolling]);

  // Apply filters - load filtered data from database
  const handleApplyFilters = useCallback(async (currentFilters = filters) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setFiltersApplied(true);
    await loadFilteredDatabaseData(currentFilters);
  }, [filters, loadFilteredDatabaseData]);

  // Reset filters and restart database polling
  const handleResetFilters = useCallback(() => {
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
    if (filtersApplied) {
      loadFilteredDatabaseData(filters);
    } else {
      fetchDataFromDatabase();
    }
  };

  // Determine which data to display for log
  const displayData = filtersApplied ? filteredData : operationsData.slice(0, 10);

  return (
    <>
      <div className="page-title">
        <div className="title-section">
          <h1>Operations Log</h1>
          <p className="page-subtitle">Complete record of all crane operations</p>
        </div>
        <div className="header-actions">
          <button onClick={handleManualRefresh} className="refresh-btn">
            Refresh
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
          <p>📊 <strong>Filtered Data Mode</strong> - Showing representative operations based on current counts.</p>
          <p>Filter: {filters.type === 'all' ? 'All Types' : filters.type} | 
             Date Range: {filters.date}</p>
          <p>⚠️ <em>Note: Showing operation types that have occurred - timestamps and durations are representative</em></p>
        </div>
      )}

      {displayData.length === 0 && (
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
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .title-section {
          flex: 1;
        }
        
        .page-subtitle {
          color: #6c757d;
          font-size: 14px;
          margin-top: 4px;
          margin-bottom: 0;
          font-weight: 400;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 15px;
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
        
        .refresh-btn:hover {
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
          font-size: 14px;
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