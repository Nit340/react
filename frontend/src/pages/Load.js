// pages/Load.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import LoadMetrics from '../components/Load/LoadMetrics';
import Filter from '../components/Filter';
import LoadChart from '../components/Load/LoadChart';
import LoadTable from '../components/Load/LoadTable';

const Load = () => {
  const [filters, setFilters] = useState({
    crane: 'Crane',
    status: 'all',
    date: 'week'
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
  const [filtersApplied, setFiltersApplied] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const pollingRef = useRef(null);

  // API base URL
  const API_BASE_URL = 'http://localhost:8000';

  // Track previous values for io operations
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
      type: 'text',
      value: 'Default Crane',
      displayOnly: true
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
        { value: 'month', label: 'This Month' }
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

  // Process io service data for operations
  const processIOData = useCallback((serviceArray, currentLoad = 0, capacity = 10000) => {
    const newOperations = [];
    let timestamp = new Date().toISOString();

    // Find io service and detect operations
    const ioService = serviceArray.find(service => service.name === 'io');
    if (ioService) {
      ioService.assets.forEach(asset => {
        const { id, value, timestamp: assetTimestamp } = asset;
        const prevValue = previousValues.current[id] || 0;

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

            // Handle timestamp properly
            let formattedTimestamp;
            try {
              const timestampObj = assetTimestamp ? new Date(assetTimestamp) : new Date();
              formattedTimestamp = timestampObj.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              }).replace(/(\d+)\/(\d+)\/(\d+),?/, '$3-$1-$2');
            } catch (error) {
              formattedTimestamp = new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              }).replace(/(\d+)\/(\d+)\/(\d+),?/, '$3-$1-$2');
            }

            // Create operation record
            const operation = {
              id: `${timestamp}_${id}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: formattedTimestamp,
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

  // Fetch load operations from database - USING NEW ENDPOINT
  const fetchFilteredData = useCallback(async (filterStatus) => {
    try {
      let url = `${API_BASE_URL}/api/database/load-operations`;
      
      // Add time filter based on date range
      const hours = filters.date === 'today' ? 24 : filters.date === 'week' ? 168 : 720;
      url += `?hours=${hours}`;
      
      console.log(`📊 Fetching load operations from: ${url}`);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`📊 Load operations response:`, result);
        
        if (result.success && result.data) {
          let filteredOperations = result.data;
          
          // Filter by status if specified
          if (filterStatus !== 'all') {
            filteredOperations = result.data.filter(op => op.status === filterStatus);
          }
          
          setFilteredLoadData(filteredOperations);
          setShowChart(true);
          console.log(`📊 Loaded ${filteredOperations.length} load operations with filter: ${filterStatus}`);
          
          // Update metrics with filtered data
          if (filteredOperations.length > 0) {
            const currentLoad = filteredOperations[0].load || 0;
            const capacity = filteredOperations[0].capacity || 10000;
            updateMetrics({ currentLoad, capacity }, filteredOperations);
          }
        } else {
          console.log('❌ No data in load operations response');
          setFilteredLoadData([]);
        }
      } else {
        console.log('❌ Load operations request failed');
        setFilteredLoadData([]);
      }
    } catch (error) {
      console.error('❌ Error fetching load operations:', error);
      setFilteredLoadData([]);
    }
  }, [filters.date, updateMetrics]);

  // Auto-fetch real-time data every second
  const fetchRealTimeData = useCallback(async () => {
    if (isLoading || filtersApplied) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/iot-data`);
      
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

          // Use both LoadCell and io services
          const filteredServices = services.filter(service => 
            service.name === 'LoadCell' || service.name === 'io'
          );

          if (filteredServices.length > 0) {
            // Process LoadCell data for current load metrics
            const loadReadings = processLoadCellData(filteredServices);
            const currentLoad = loadReadings.currentLoad || 0;
            const capacity = loadReadings.capacity || 10000;

            // Process io data for operations
            const newOperations = processIOData(filteredServices, currentLoad, capacity);

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
      console.error('Error fetching real-time data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, filtersApplied, processLoadCellData, processIOData, updateMetrics, loadData]);

  // Start automatic polling when component mounts
  useEffect(() => {
    // Start polling immediately for real-time data
    fetchRealTimeData();
    pollingRef.current = setInterval(fetchRealTimeData, 1000);

    // Cleanup on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchRealTimeData]);

  // Apply filters - FETCHES FROM DATABASE
  const handleApplyFilters = useCallback(() => {
    console.log('🔍 Applying filters:', filters);
    
    // Stop real-time polling when filters are applied
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setFiltersApplied(true);
    
    // Fetch filtered data from database
    fetchFilteredData(filters.status);
  }, [filters, fetchFilteredData]);

  // Reset filters and restart real-time data fetching
  const handleResetFilters = useCallback(() => {
    console.log('🔄 Resetting filters');
    
    setFilters({
      crane: 'Crane',
      status: 'all',
      date: 'week'
    });
    setFiltersApplied(false);
    setFilteredLoadData([]);
    setShowChart(false);
    
    // Restart real-time polling
    fetchRealTimeData();
    pollingRef.current = setInterval(fetchRealTimeData, 1000);
  }, [fetchRealTimeData]);

  const handleFilterChange = useCallback((filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  }, []);

  // Determine which data to display
  const displayData = filtersApplied ? filteredLoadData : loadData;

  return (
    <>
      <div className="page-title">
        <h1>Load Lift Log</h1>
        <p>Real-time load monitoring during crane operations from io service</p>
      </div>

      <LoadMetrics metrics={metrics} />

      <Filter 
        filters={filterConfig}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />

      {filtersApplied && (
        <div className="filter-applied-message" style={{
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px',
          padding: '10px',
          margin: '10px 0'
        }}>
          <p><strong>Filters applied</strong> - Showing historical data from database. Click "Reset Filters" to resume live data.</p>
          <p>Current filter: <strong>{filters.status === 'all' ? 'All Statuses' : filters.status}</strong>, Date range: <strong>{filters.date}</strong></p>
          <p>Displaying: <strong>{filteredLoadData.length}</strong> load records</p>
        </div>
      )}

      {!filtersApplied && (
        <div className="live-data-message">

        </div>
      )}

      {showChart && displayData.length > 0 && (
        <LoadChart loadData={displayData} />
      )}

      {displayData.length > 0 ? (
        <LoadTable loadData={displayData} />
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#666',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          margin: '20px 0'
        }}>
          <h3>No Load Data Available</h3>
          <p>{
            filtersApplied 
              ? 'No historical data found for the selected filters.' 
              : 'Waiting for real-time load data from IoT services...'
          }</p>
          {filtersApplied && (
            <p style={{ fontSize: '14px', marginTop: '10px' }}>
              <em>Tip: Try changing the status filter or date range.</em>
            </p>
          )}
        </div>
      )}
    </>
  );
};

export default Load;