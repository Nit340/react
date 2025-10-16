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
    switch: 0,
    duration: '0:00:00',
    load: '0 kg'
  });

  const [filtersApplied, setFiltersApplied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  
  const pollingRef = useRef(null);
  
  // Track previous values to detect operations for real-time log
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
      const date = new Date(timestamp);
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

  // Calculate metrics from database data
  const calculateMetricsFromDatabase = useCallback((databaseData) => {
    console.log('📊 Calculating metrics from database data:', databaseData);
    
    let hoistUp = 0;
    let hoistDown = 0;
    let ctLeft = 0;
    let ctRight = 0;
    let ltForward = 0;
    let ltReverse = 0;
    let totalLoad = 0;
    let loadCount = 0;
    const operationTimestamps = [];

    // Check if databaseData is an array of services
    if (Array.isArray(databaseData)) {
      databaseData.forEach(service => {
        if (!service || !service.assets) {
          console.log('⚠️ Service or assets missing:', service);
          return;
        }

        console.log(`🔍 Processing service: ${service.name} with ${service.assets?.length || 0} assets`);

        // Collect load data from LoadCell service
        if (service.name === 'LoadCell' || service.name === 'loadcell') {
          const loadAsset = service.assets.find(asset => 
            asset.id === 'Load' || asset.id === 'load'
          );
          if (loadAsset) {
            const loadValue = parseFloat(loadAsset.value) || 0;
            console.log(`⚖️ Load value found: ${loadValue}`);
            if (loadValue > 0) {
              totalLoad += loadValue;
              loadCount++;
            }
          } else {
            console.log('❌ No load asset found in LoadCell service');
          }
        }

        // Count operations from io service
        if (service.name === 'io' || service.name === 'IO') {
          service.assets.forEach(asset => {
            const { id, value, timestamp } = asset;
            const numericValue = parseFloat(value);
            
            console.log(`🔧 IO Asset: ${id} = ${value} (timestamp: ${timestamp})`);
            
            // Look for digital signals (value = 1) or any positive value
            if (numericValue === 1 || numericValue > 0) {
              const assetId = id.toLowerCase();
              
              if (assetId.includes('hoist')) {
                if (assetId.includes('up')) {
                  hoistUp++;
                  operationTimestamps.push(new Date(timestamp).getTime());
                  console.log('✅ Hoist Up operation counted');
                } else if (assetId.includes('down')) {
                  hoistDown++;
                  operationTimestamps.push(new Date(timestamp).getTime());
                  console.log('✅ Hoist Down operation counted');
                }
              } else if (assetId.includes('ct')) {
                if (assetId.includes('left')) {
                  ctLeft++;
                  operationTimestamps.push(new Date(timestamp).getTime());
                  console.log('✅ CT Left operation counted');
                } else if (assetId.includes('right')) {
                  ctRight++;
                  operationTimestamps.push(new Date(timestamp).getTime());
                  console.log('✅ CT Right operation counted');
                }
              } else if (assetId.includes('lt')) {
                if (assetId.includes('forward')) {
                  ltForward++;
                  operationTimestamps.push(new Date(timestamp).getTime());
                  console.log('✅ LT Forward operation counted');
                } else if (assetId.includes('reverse')) {
                  ltReverse++;
                  operationTimestamps.push(new Date(timestamp).getTime());
                  console.log('✅ LT Reverse operation counted');
                }
              }
            }
          });
        }
      });
    } else {
      console.error('❌ Database data is not an array:', databaseData);
    }

    console.log(`📈 Operation counts - Hoist: ${hoistUp} up, ${hoistDown} down | CT: ${ctLeft} left, ${ctRight} right | LT: ${ltForward} forward, ${ltReverse} reverse`);
    console.log(`⚖️ Load data: ${loadCount} readings, total: ${totalLoad}`);

    // Calculate duration from operation intervals
    let totalSeconds = 0;
    if (operationTimestamps.length >= 2) {
      const sortedTimestamps = [...operationTimestamps].sort((a, b) => a - b);
      console.log(`⏱️ Calculating duration from ${sortedTimestamps.length} timestamps`);
      
      for (let i = 1; i < sortedTimestamps.length; i++) {
        const prevTime = sortedTimestamps[i - 1];
        const currTime = sortedTimestamps[i];
        const intervalSeconds = (currTime - prevTime) / 1000;
        
        // Only count intervals less than 5 minutes (300 seconds) to avoid long idle periods
        if (intervalSeconds < 300) {
          totalSeconds += intervalSeconds;
        }
      }
    }

    console.log(`⏱️ Total operation duration: ${totalSeconds} seconds`);

    // Format duration
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const duration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Calculate average load
    const averageLoad = loadCount > 0 ? Math.round(totalLoad / loadCount) : 0;
    const load = `${averageLoad.toLocaleString()} kg`;

    const calculatedMetrics = {
      hoist: {
        up: hoistUp,
        down: hoistDown,
        total: hoistUp + hoistDown
      },
      ct: {
        left: ctLeft,
        right: ctRight,
        total: ctLeft + ctRight
      },
      lt: {
        forward: ltForward,
        reverse: ltReverse,
        total: ltForward + ltReverse
      },
      switch: 0,
      duration,
      load
    };

    console.log('📊 Final calculated metrics:', calculatedMetrics);
    return calculatedMetrics;
  }, []);

  // Fetch metrics from database
  const fetchMetricsFromDatabase = useCallback(async () => {
    console.log('🔄 Fetching metrics from database...');
    setIsLoadingMetrics(true);
    
    try {
      const response = await fetch('/api/database/services');
      console.log('📡 Database response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📦 Database response data:', result);
        
        if (result.success && result.data) {
          console.log('✅ Database data received, calculating metrics...');
          const calculatedMetrics = calculateMetricsFromDatabase(result.data);
          setMetrics(calculatedMetrics);
        } else {
          console.error('❌ Database response not successful:', result);
          // Set default metrics if no data
          setMetrics({
            hoist: { total: 0, up: 0, down: 0 },
            ct: { total: 0, left: 0, right: 0 },
            lt: { total: 0, forward: 0, reverse: 0 },
            switch: 0,
            duration: '0:00:00',
            load: '0 kg'
          });
        }
      } else {
        console.error('❌ Database fetch failed with status:', response.status);
        // Set default metrics on error
        setMetrics({
          hoist: { total: 0, up: 0, down: 0 },
          ct: { total: 0, left: 0, right: 0 },
          lt: { total: 0, forward: 0, reverse: 0 },
          switch: 0,
          duration: '0:00:00',
          load: '0 kg'
        });
      }
    } catch (error) {
      console.error('❌ Error fetching metrics from database:', error);
      // Set default metrics on error
      setMetrics({
        hoist: { total: 0, up: 0, down: 0 },
        ct: { total: 0, left: 0, right: 0 },
        lt: { total: 0, forward: 0, reverse: 0 },
        switch: 0,
        duration: '0:00:00',
        load: '0 kg'
      });
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [calculateMetricsFromDatabase]);

  // Process service data for real-time log only
  const processServiceDataForLog = useCallback((serviceArray) => {
    const newOperations = [];
    let currentLoad = 0;

    // Find LoadCell service for current load display in log
    const loadCellService = serviceArray.find(service => 
      service.name === 'LoadCell' || service.name === 'loadcell'
    );
    if (loadCellService && loadCellService.assets) {
      const loadAsset = loadCellService.assets.find(asset => 
        asset.id === 'Load' || asset.id === 'load'
      );
      if (loadAsset) {
        currentLoad = parseFloat(loadAsset.value) || 0;
      }
    }

    // Find io service and detect operations for real-time log
    const ioService = serviceArray.find(service => 
      service.name === 'io' || service.name === 'IO'
    );
    if (ioService && ioService.assets) {
      ioService.assets.forEach(asset => {
        const { id, value, timestamp } = asset;
        const prevValue = previousValues.current[id] || 0;
        const numericValue = parseFloat(value);

        const operationDatapoints = [
          'Hoist_Up', 'Hoist_Down', 'hoist_up', 'hoist_down',
          'Ct_Left', 'Ct_Right', 'ct_left', 'ct_right', 
          'Lt_Forward', 'Lt_Reverse', 'lt_forward', 'lt_reverse'
        ];
        
        if (operationDatapoints.includes(id)) {
          // Detect operation triggers (edge detection: 0 -> 1)
          if (prevValue === 0 && numericValue === 1) {
            let operationType = '';

            switch(id.toLowerCase()) {
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

            const operation = {
              id: `${timestamp}_${id}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: formatTimestamp(timestamp),
              rawTimestamp: timestamp,
              craneId: 'Crane',
              operation: operationType,
              duration: '0:15',
              load: `${currentLoad} kg`
            };

            newOperations.push(operation);
          }

          previousValues.current[id] = numericValue;
        }
      });
    }

    return newOperations;
  }, [formatTimestamp]);

  // Real-time data fetching for log only
  const fetchRealTimeData = useCallback(async () => {
    if (isLoading || filtersApplied) return;
    
    setIsLoading(true);
    
    try {
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
          let services = [];

          if (result.data.services && Array.isArray(result.data.services)) {
            services = result.data.services;
          } else if (Array.isArray(result.data)) {
            services = result.data;
          }

          const newOperations = processServiceDataForLog(services);

          // Update operations data for log only
          if (newOperations.length > 0) {
            setOperationsData(prevOperations => {
              return [...newOperations, ...prevOperations].slice(0, 100);
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching real-time data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, filtersApplied, processServiceDataForLog]);

  // Start real-time mode with polling for log only
  const startRealtimeMode = useCallback(() => {
    // Initial fetch
    fetchRealTimeData();
    
    // Polling for real-time updates
    pollingRef.current = setInterval(fetchRealTimeData, 1000);
  }, [fetchRealTimeData]);

  // Load database data only when filters are applied
  const loadDatabaseData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/database/services');
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          const historicalOperations = [];
          let currentLoad = 0;

          result.data.forEach(service => {
            if (!service || !service.assets) return;

            if (service.name === 'LoadCell' || service.name === 'loadcell') {
              const loadAsset = service.assets.find(asset => 
                asset.id === 'Load' || asset.id === 'load'
              );
              if (loadAsset) {
                currentLoad = parseFloat(loadAsset.value) || 0;
              }
            }

            if (service.name === 'io' || service.name === 'IO') {
              service.assets.forEach(asset => {
                const { id, value, timestamp } = asset;
                const numericValue = parseFloat(value);
                
                const operationDatapoints = [
                  'Hoist_Up', 'Hoist_Down', 'hoist_up', 'hoist_down',
                  'Ct_Left', 'Ct_Right', 'ct_left', 'ct_right', 
                  'Lt_Forward', 'Lt_Reverse', 'lt_forward', 'lt_reverse'
                ];
                
                if (operationDatapoints.includes(id) && numericValue === 1) {
                  let operationType = '';
                  
                  switch(id.toLowerCase()) {
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
                    historicalOperations.push({
                      id: `${timestamp}_${id}_${Math.random().toString(36).substr(2, 9)}`,
                      timestamp: formatTimestamp(timestamp),
                      rawTimestamp: timestamp,
                      craneId: 'Crane',
                      operation: operationType,
                      duration: '0:15',
                      load: `${currentLoad} kg`
                    });
                  }
                }
              });
            }
          });

          let filteredOperations = historicalOperations;
          if (filters.type !== 'all') {
            filteredOperations = historicalOperations.filter(op => op.operation === filters.type);
          }

          filteredOperations.sort((a, b) => new Date(b.rawTimestamp) - new Date(a.rawTimestamp));
          
          setFilteredData(filteredOperations.slice(0, 10));
        }
      }
    } catch (error) {
      console.error('Error loading database data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters.type, formatTimestamp]);

  // Start automatic real-time polling when component mounts
  useEffect(() => {
    console.log('🚀 OperationsLog component mounted');
    
    // Fetch metrics from database on component mount
    fetchMetricsFromDatabase();
    
    // Start real-time log polling
    startRealtimeMode();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchMetricsFromDatabase, startRealtimeMode]);

  // Apply filters - load from database when filters are applied
  const handleApplyFilters = useCallback(async (currentFilters = filters) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setFiltersApplied(true);
    await loadDatabaseData();
  }, [filters, loadDatabaseData]);

  // Reset filters and restart real-time data fetching
  const handleResetFilters = useCallback(() => {
    setFilters({
      crane: 'Crane',
      type: 'all',
      date: 'week'
    });
    setFiltersApplied(false);
    setFilteredData([]);
    
    // Refresh metrics from database
    fetchMetricsFromDatabase();
    
    // Restart real-time log
    startRealtimeMode();
  }, [fetchMetricsFromDatabase, startRealtimeMode]);

  const handleFilterChange = useCallback((filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  }, []);

  // Manual refresh
  const handleManualRefresh = () => {
    if (filtersApplied) {
      loadDatabaseData();
    } else {
      fetchRealTimeData();
    }
    
    // Always refresh metrics from database
    fetchMetricsFromDatabase();
  };

  // Determine which data to display for log
  const displayData = filtersApplied ? filteredData : operationsData.slice(0, 10);

  return (
    <>
      <div className="page-title">
        <h1>Operations Log</h1>
        <div className="header-actions">
          <button onClick={handleManualRefresh} className="refresh-btn" disabled={isLoading || isLoadingMetrics}>
            {isLoading || isLoadingMetrics ? 'Loading...' : 'Refresh'}
          </button>
          {isLoadingMetrics && (
            <span className="metrics-loading">Updating metrics...</span>
          )}
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
          <p>📊 <strong>Historical Data Mode</strong> - Showing filtered data from database.</p>
          <p>Current filter: {filters.type === 'all' ? 'All Types' : filters.type}</p>
        </div>
      )}

      {!filtersApplied && (
        <div className="realtime-message">
          <p>⚡ <strong>Real-time Mode</strong> - Live operations monitoring active.</p>
          <p>📈 <strong>Metrics</strong> - Calculated from database historical data</p>
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
        
        .metrics-loading {
          color: #6c757d;
          font-size: 14px;
          font-style: italic;
        }
        
        .filter-applied-message {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 20px;
          color: #856404;
        }
        
        .realtime-message {
          background: #d1ecf1;
          border: 1px solid #bee5eb;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 20px;
          color: #0c5460;
        }
      `}</style>
    </>
  );
};

export default OperationsLog;