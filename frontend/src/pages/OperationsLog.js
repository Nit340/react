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
  
  // Simple metrics state
  const [metrics, setMetrics] = useState({
    hoist: { total: 0, up: 0, down: 0 },
    ct: { total: 0, left: 0, right: 0 },
    lt: { total: 0, forward: 0, reverse: 0 },
    switch: 0,
    duration: '0:00:00',
    load: '0T'
  });

  const [filtersApplied, setFiltersApplied] = useState(false);
  
  const pollingRef = useRef(null);

  // API base URL
  const API_BASE_URL = 'http://localhost:8000';

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

  // Fix timestamp parsing for UTC format with 'Z'
  const parseTimestamp = useCallback((timestamp) => {
    try {
      // Handle UTC format with 'Z' - datetime.utcnow().isoformat() + 'Z'
      if (timestamp.includes('Z')) {
        return new Date(timestamp);
      }
      // Handle other formats
      return new Date(timestamp);
    } catch (error) {
      console.error('Error parsing timestamp:', timestamp, error);
      return new Date(); // Fallback to current time
    }
  }, []);

  // Format timestamp for display
  const formatTimestamp = useCallback((timestamp) => {
    const date = parseTimestamp(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }, [parseTimestamp]);

  // Load counts from database when component mounts
  const loadCountsFromDatabase = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/database/assets?hours=720`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log('📊 Database assets received:', result.data.length);
          
          // Count ALL operations from database (simple count of assets with value=1)
          const databaseAssets = result.data;
          
          const hoistUp = databaseAssets.filter(asset => asset.asset_id === 'Hoist_Up' && asset.value === 1).length;
          const hoistDown = databaseAssets.filter(asset => asset.asset_id === 'Hoist_Down' && asset.value === 1).length;
          const ctLeft = databaseAssets.filter(asset => asset.asset_id === 'Ct_Left' && asset.value === 1).length;
          const ctRight = databaseAssets.filter(asset => asset.asset_id === 'Ct_Right' && asset.value === 1).length;
          const ltForward = databaseAssets.filter(asset => asset.asset_id === 'Lt_Forward' && asset.value === 1).length;
          const ltReverse = databaseAssets.filter(asset => asset.asset_id === 'Lt_Reverse' && asset.value === 1).length;

          const totalOperations = hoistUp + hoistDown + ctLeft + ctRight + ltForward + ltReverse;
          
          // Calculate duration
          const totalMinutes = totalOperations * 0.25;
          const hours = Math.floor(totalMinutes / 60);
          const minutes = Math.floor(totalMinutes % 60);
          const seconds = Math.floor((totalMinutes * 60) % 60);
          const duration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

          // Get current load from latest Load asset
          const loadAssets = databaseAssets.filter(asset => asset.asset_id === 'Load');
          const latestLoadAsset = loadAssets.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          )[0];
          const currentLoad = latestLoadAsset ? latestLoadAsset.value : 0;

          setMetrics({
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
            load: `${currentLoad.toLocaleString()}T`
          });

          console.log('📊 Loaded counts from database:', {
            hoistUp, hoistDown, ctLeft, ctRight, ltForward, ltReverse,
            totalOperations, currentLoad
          });
        }
      }
    } catch (error) {
      console.error('Error loading counts from database:', error);
    }
  }, []);

  // Update metrics with new operations - SIMPLE: just count and add
  const updateMetrics = useCallback((newOperations, currentLoad = 0) => {
    setMetrics(prevMetrics => {
      // Count new operations
      const newHoistUp = newOperations.filter(op => op.operation === 'hoist-up').length;
      const newHoistDown = newOperations.filter(op => op.operation === 'hoist-down').length;
      const newCtLeft = newOperations.filter(op => op.operation === 'ct-left').length;
      const newCtRight = newOperations.filter(op => op.operation === 'ct-right').length;
      const newLtForward = newOperations.filter(op => op.operation === 'lt-forward').length;
      const newLtReverse = newOperations.filter(op => op.operation === 'lt-reverse').length;

      // ADD to existing counts
      const hoist = {
        up: prevMetrics.hoist.up + newHoistUp,
        down: prevMetrics.hoist.down + newHoistDown,
      };
      hoist.total = hoist.up + hoist.down;

      const ct = {
        left: prevMetrics.ct.left + newCtLeft,
        right: prevMetrics.ct.right + newCtRight,
      };
      ct.total = ct.left + ct.right;

      const lt = {
        forward: prevMetrics.lt.forward + newLtForward,
        reverse: prevMetrics.lt.reverse + newLtReverse,
      };
      lt.total = lt.forward + lt.reverse;

      // Calculate total operations
      const totalOperations = hoist.total + ct.total + lt.total;

      // Calculate duration
      const totalMinutes = totalOperations * 0.25;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.floor(totalMinutes % 60);
      const seconds = Math.floor((totalMinutes * 60) % 60);
      const duration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      // Use current load
      let loadValue = currentLoad;
      if (loadValue === 0 && newOperations.length > 0) {
        const latestLoad = newOperations[0].load;
        loadValue = parseFloat(latestLoad.replace(/,/g, '')) || 0;
      }

      console.log('📈 Updated metrics with new operations:', {
        newHoistUp, newHoistDown, newCtLeft, newCtRight, newLtForward, newLtReverse,
        total: totalOperations
      });

      return {
        hoist,
        ct,
        lt,
        switch: 0,
        duration,
        load: `${loadValue.toLocaleString()}T`
      };
    });
  }, []);

  // Process service data and extract operations
  const processServiceData = useCallback((serviceArray) => {
    const newOperations = [];
    let currentLoad = 0;

    console.log('🔄 Processing services:', serviceArray);

    // Find LoadCell service and get current load
    const loadCellService = serviceArray.find(service => service.name === 'LoadCell');
    if (loadCellService && loadCellService.assets) {
      const loadAsset = loadCellService.assets.find(asset => asset.id === 'Load');
      if (loadAsset) {
        currentLoad = parseFloat(loadAsset.value) || 0;
        console.log('📦 Current load:', currentLoad);
      }
    }

    // Find io service and detect operations
    const ioService = serviceArray.find(service => service.name === 'io');
    if (ioService && ioService.assets) {
      console.log('🎯 Found io service with assets:', ioService.assets);
      
      ioService.assets.forEach(asset => {
        const { id, value, timestamp } = asset;
        const prevValue = previousValues.current[id] || 0;

        console.log(`🔍 Processing ${id}: prev=${prevValue}, current=${value}, timestamp=${timestamp}`);

        // Only process the specific datapoints we care about
        const operationDatapoints = ['Hoist_Up', 'Hoist_Down', 'Ct_Left', 'Ct_Right', 'Lt_Forward', 'Lt_Reverse'];
        
        if (operationDatapoints.includes(id)) {
          // Detect operation triggers (edge detection: 0 -> 1)
          if (prevValue === 0 && value === 1) {
            let operationType = '';
            let craneId = 'Crane';

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

            // Create operation record with proper timestamp parsing
            const operation = {
              id: `${timestamp}_${id}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: formatTimestamp(timestamp),
              craneId: craneId,
              operation: operationType,
              duration: '0:15',
              load: currentLoad.toLocaleString()
            };

            console.log('🎉 New operation detected:', operation);
            newOperations.push(operation);
          }

          // Update previous value
          previousValues.current[id] = value;
        }
      });
    } else {
      console.log('❌ No io service found in data');
    }

    console.log(`📈 Total new operations detected: ${newOperations.length}`);
    return { newOperations, currentLoad };
  }, [formatTimestamp]);

  // Auto-fetch real-time data every second
  const fetchRealTimeData = useCallback(async () => {
    if (filtersApplied) return;
    
    try {
      console.log('📡 Fetching real-time data from API...');
      const response = await fetch(`${API_BASE_URL}/api/iot-data`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ API response received:', result);
        
        if (result.success && result.data) {
          let services = [];

          // Handle different data formats
          if (result.data.services && Array.isArray(result.data.services)) {
            services = result.data.services;
            console.log('📋 Services from data.services:', services);
          } else if (Array.isArray(result.data)) {
            services = result.data;
            console.log('📋 Services from data array:', services);
          }

          // Filter to only use io and LoadCell services
          const filteredServices = services.filter(service => 
            service && (service.name === 'io' || service.name === 'LoadCell')
          );

          console.log('🎯 Filtered services:', filteredServices);

          // Process services and extract operations
          const { newOperations, currentLoad } = processServiceData(filteredServices);

          // Update operations data
          setOperationsData(prevOperations => {
            const updatedOperations = newOperations.length > 0 
              ? [...newOperations, ...prevOperations].slice(0, 100)
              : prevOperations;
            
            // Update metrics by adding new counts
            if (newOperations.length > 0) {
              updateMetrics(newOperations, currentLoad);
            }
            
            return updatedOperations;
          });
        } else {
          console.log('❌ No success or data in response');
        }
      } else {
        console.log('❌ API response not OK:', response.status);
      }
    } catch (error) {
      console.error('💥 Error fetching real-time data:', error);
    }
  }, [filtersApplied, processServiceData, updateMetrics]);

  // Start automatic polling when component mounts
  useEffect(() => {
    // Load counts from database first
    loadCountsFromDatabase();
    
    // Start polling for real-time data
    fetchRealTimeData();
    pollingRef.current = setInterval(fetchRealTimeData, 1000);

    // Cleanup on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchRealTimeData, loadCountsFromDatabase]);

  // Apply filters - use local operations data
  const handleApplyFilters = useCallback((currentFilters = filters) => {
    // Stop real-time polling when filters are applied
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setFiltersApplied(true);
    
    // Filter the existing operations data
    let filteredOperations = [...operationsData];
    
    // Filter by operation type
    if (currentFilters.type !== 'all') {
      filteredOperations = filteredOperations.filter(op => op.operation === currentFilters.type);
    }
    
    // Take only the last 10 operations for display
    const displayOperations = filteredOperations.slice(0, 10);
    
    setFilteredData(displayOperations);
    
    console.log(`🔍 Applied filter: ${currentFilters.type}, showing ${displayOperations.length} operations`);
  }, [filters, operationsData]);

  // Reset filters and restart real-time data fetching
  const handleResetFilters = useCallback(() => {
    setFilters({
      crane: 'Crane',
      type: 'all',
      date: 'week'
    });
    setFiltersApplied(false);
    setFilteredData([]);
    
    // Restart real-time polling
    fetchRealTimeData();
    pollingRef.current = setInterval(fetchRealTimeData, 1000);
    
    console.log('🔄 Filters reset, resuming real-time data');
  }, [fetchRealTimeData]);

  const handleFilterChange = useCallback((filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  }, []);

  // Determine which data to display
  const displayData = filtersApplied ? filteredData : operationsData.slice(0, 10);

  return (
    <>
      <div className="page-title">
        <h1>Operations Log</h1>
        <p>Real-time crane operations from io and LoadCell services</p>
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
          <p>Filters applied - Showing filtered data. Click "Reset Filters" to resume live data.</p>
          <p>Current filter: {filters.type === 'all' ? 'All Types' : filters.type}</p>
        </div>
      )}

      {/* ALWAYS SHOW THE TABLE */}
      <OperationsTable operations={displayData} />
    </>
  );
};

export default OperationsLog;