// pages/EnergyMonitoring.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import EnergyMetrics from '../components/EnergyMonitoring/EnergyMetrics';
import Filter from '../components/Filter';
import EnergyCharts from '../components/EnergyMonitoring/EnergyCharts';
import EnergyTable from '../components/EnergyMonitoring/EnergyTable';
import ConnectionStatus from '../components/Demo/ConnectionStatus';
import DemoControls from '../components/Demo/DemoControls';

const EnergyMonitoring = () => {
  const [filters, setFilters] = useState({
    crane: 'all',
    motor: 'all',
    date: 'today',
    metric: 'power'
  });
  const [metrics, setMetrics] = useState({
    totalPower: '0 kW',
    energyCost: '$0.00',
    efficiency: '0%',
    energyPerTon: '0 kWh/T'
  });
  const [energyData, setEnergyData] = useState([]);

  // Mode and connection states
  const [mode, setMode] = useState('polling');
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(5000); // Increased to 5 seconds
  const [apiStatus, setApiStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const ws = useRef(null);
  const pollingRef = useRef(null);

  // Filter configuration for Energy Monitoring
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
      key: 'motor',
      label: 'Motor Type',
      type: 'select',
      value: filters.motor,
      options: [
        { value: 'all', label: 'All Motors' },
        { value: 'hoist', label: 'Hoist Motor' },
        { value: 'ct', label: 'CT Motor' },
        { value: 'lt', label: 'LT Motor' }
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
        { value: 'year', label: 'This Year' },
        { value: 'custom', label: 'Custom Range' }
      ]
    },
    {
      key: 'metric',
      label: 'Energy Metric',
      type: 'select',
      value: filters.metric,
      options: [
        { value: 'power', label: 'Power (kW)' },
        { value: 'current', label: 'Current (A)' },
        { value: 'voltage', label: 'Voltage (V)' },
        { value: 'energy', label: 'Energy (kWh)' },
        { value: 'cost', label: 'Cost ($)' }
      ]
    }
  ];

  // Process modbus service data and extract energy metrics
  const processModbusData = useCallback((serviceArray) => {
    const energyReadings = {};
    let timestamp = new Date().toISOString();

    // Find modbus service
    const modbusService = serviceArray.find(service => service.name === 'modbus');
    if (modbusService) {
      modbusService.assets.forEach(asset => {
        const { id, value, timestamp: assetTimestamp } = asset;
        
        // Map datapoints to our energy metrics
        switch(id) {
          case 'Hoist_voltage':
            energyReadings.hoistVoltage = parseFloat(value) || 0;
            break;
          case 'Hoist_current':
            energyReadings.hoistCurrent = parseFloat(value) || 0;
            break;
          case 'Hoist_power':
            energyReadings.hoistPower = parseFloat(value) || 0;
            break;
          case 'Hoist_frequency':
            energyReadings.hoistFrequency = parseFloat(value) || 0;
            break;
          case 'Ct_voltage':
            energyReadings.ctVoltage = parseFloat(value) || 0;
            break;
          case 'Ct_current':
            energyReadings.ctCurrent = parseFloat(value) || 0;
            break;
          case 'Ct_power':
            energyReadings.ctPower = parseFloat(value) || 0;
            break;
          case 'Ct_frequency':
            energyReadings.ctFrequency = parseFloat(value) || 0;
            break;
          case 'Lt_voltage':
            energyReadings.ltVoltage = parseFloat(value) || 0;
            break;
          case 'Lt_current':
            energyReadings.ltCurrent = parseFloat(value) || 0;
            break;
          case 'Lt_power':
            energyReadings.ltPower = parseFloat(value) || 0;
            break;
          case 'Lt_frequency':
            energyReadings.ltFrequency = parseFloat(value) || 0;
            break;
        }
        
        if (assetTimestamp) {
          timestamp = assetTimestamp;
        }
      });
    }

    return { energyReadings, timestamp };
  }, []);

  // More accurate electrical calculations
  const updateMetrics = useCallback((energyReadings) => {
    const {
      hoistPower = 0,
      ctPower = 0,
      ltPower = 0,
      hoistCurrent = 0,
      ctCurrent = 0,
      ltCurrent = 0,
      hoistVoltage = 400,
      ctVoltage = 400,
      ltVoltage = 400
    } = energyReadings;

    // 1. TOTAL POWER CALCULATION (More Accurate)
    const totalPower = hoistPower + ctPower + ltPower;
    
    // Alternative: Calculate power from voltage and current if power not provided
    const calculatedHoistPower = hoistPower > 0 ? hoistPower : (hoistVoltage * hoistCurrent * 0.85) / 1000;
    const calculatedCtPower = ctPower > 0 ? ctPower : (ctVoltage * ctCurrent * 0.85) / 1000;
    const calculatedLtPower = ltPower > 0 ? ltPower : (ltVoltage * ltCurrent * 0.85) / 1000;
    
    const actualTotalPower = calculatedHoistPower + calculatedCtPower + calculatedLtPower;

    // 2. ENERGY COST CALCULATION (More Realistic)
    const electricityRate = 0.15; // $0.15 per kWh
    const operatingHours = 8; // Assume 8-hour operation day
    const dailyEnergy = actualTotalPower * operatingHours; // kWh per day
    const energyCost = dailyEnergy * electricityRate;

    // 3. EFFICIENCY CALCULATION (More Technical)
    const totalApparentPower = (hoistVoltage * hoistCurrent + ctVoltage * ctCurrent + ltVoltage * ltCurrent) / 1000; // kVA
    const powerFactor = totalApparentPower > 0 ? actualTotalPower / totalApparentPower : 0;
    
    // Efficiency based on power factor and load (simplified motor efficiency curve)
    let efficiency = 0;
    if (actualTotalPower > 0) {
      const loadFactor = Math.min(1, actualTotalPower / 50); // Assume 50kW max capacity
      const baseEfficiency = 85 + (loadFactor * 10); // 85-95% range based on load
      const powerFactorPenalty = (1 - powerFactor) * 10; // Penalty for poor power factor
      efficiency = Math.max(75, Math.min(95, baseEfficiency - powerFactorPenalty));
    }

    // 4. ENERGY PER TON CALCULATION (Industry Standard)
    const assumedLoad = 25; // Assume 25-ton average load
    const energyPerTon = actualTotalPower > 0 ? (dailyEnergy / assumedLoad).toFixed(1) : 0;

    setMetrics({
      totalPower: `${actualTotalPower.toFixed(1)} kW`,
      energyCost: `$${energyCost.toFixed(2)}`,
      efficiency: `${efficiency.toFixed(0)}%`,
      energyPerTon: `${energyPerTon} kWh/T`
    });
  }, []);

  // Enhanced energy record creation with better calculations and duplicate prevention
  const createEnergyRecord = useCallback((energyReadings, timestamp) => {
    const {
      hoistVoltage = 0,
      hoistCurrent = 0,
      hoistPower = 0,
      hoistFrequency = 0,
      ctVoltage = 0,
      ctCurrent = 0,
      ctPower = 0,
      ctFrequency = 0,
      ltVoltage = 0,
      ltCurrent = 0,
      ltPower = 0,
      ltFrequency = 0
    } = energyReadings;

    // Calculate actual power if not provided
    const calcHoistPower = hoistPower > 0 ? hoistPower : (hoistVoltage * hoistCurrent * 0.85) / 1000;
    const calcCtPower = ctPower > 0 ? ctPower : (ctVoltage * ctCurrent * 0.85) / 1000;
    const calcLtPower = ltPower > 0 ? ltPower : (ltVoltage * ltCurrent * 0.85) / 1000;

    // Determine status based on industry standards
    const getStatus = (power, current, voltage, frequency) => {
      const powerFactor = (power * 1000) / (voltage * current);
      
      if (current === 0 && power === 0) return 'offline';
      if (power > 20 || current > 35 || powerFactor < 0.7) return 'warning';
      if (power > 15 || current > 25 || Math.abs(frequency - 50) > 2) return 'normal';
      return 'efficient';
    };

    const records = [];
    const electricityRate = 0.15; // $0.15 per kWh
    const operatingTime = 0.5; // Assume 30 minutes operation per record

    // Create unique timestamp for each record to prevent duplicates
    const baseTime = new Date(timestamp);
    
    // Hoist motor record
    if (calcHoistPower > 0 || hoistCurrent > 0) {
      const uniqueTime = new Date(baseTime.getTime() + 1000); // Add 1 second for uniqueness
      records.push({
        id: `hoist_${uniqueTime.getTime()}`,
        timestamp: uniqueTime.toLocaleString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),?/, '$3-$1-$2'),
        craneId: 'CRN-001',
        motorType: 'Hoist',
        power: parseFloat(calcHoistPower.toFixed(1)),
        current: parseFloat(hoistCurrent.toFixed(1)),
        voltage: parseFloat(hoistVoltage.toFixed(0)),
        energy: parseFloat((calcHoistPower * operatingTime).toFixed(1)),
        cost: parseFloat(((calcHoistPower * operatingTime) * electricityRate).toFixed(2)),
        frequency: parseFloat(hoistFrequency.toFixed(1)),
        status: getStatus(calcHoistPower, hoistCurrent, hoistVoltage, hoistFrequency)
      });
    }

    // CT (Cross Travel) motor record
    if (calcCtPower > 0 || ctCurrent > 0) {
      const uniqueTime = new Date(baseTime.getTime() + 2000); // Add 2 seconds for uniqueness
      records.push({
        id: `ct_${uniqueTime.getTime()}`,
        timestamp: uniqueTime.toLocaleString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),?/, '$3-$1-$2'),
        craneId: 'CRN-001',
        motorType: 'CT',
        power: parseFloat(calcCtPower.toFixed(1)),
        current: parseFloat(ctCurrent.toFixed(1)),
        voltage: parseFloat(ctVoltage.toFixed(0)),
        energy: parseFloat((calcCtPower * operatingTime).toFixed(1)),
        cost: parseFloat(((calcCtPower * operatingTime) * electricityRate).toFixed(2)),
        frequency: parseFloat(ctFrequency.toFixed(1)),
        status: getStatus(calcCtPower, ctCurrent, ctVoltage, ctFrequency)
      });
    }

    // LT (Long Travel) motor record
    if (calcLtPower > 0 || ltCurrent > 0) {
      const uniqueTime = new Date(baseTime.getTime() + 3000); // Add 3 seconds for uniqueness
      records.push({
        id: `lt_${uniqueTime.getTime()}`,
        timestamp: uniqueTime.toLocaleString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),?/, '$3-$1-$2'),
        craneId: 'CRN-001',
        motorType: 'LT',
        power: parseFloat(calcLtPower.toFixed(1)),
        current: parseFloat(ltCurrent.toFixed(1)),
        voltage: parseFloat(ltVoltage.toFixed(0)),
        energy: parseFloat((calcLtPower * operatingTime).toFixed(1)),
        cost: parseFloat(((calcLtPower * operatingTime) * electricityRate).toFixed(2)),
        frequency: parseFloat(ltFrequency.toFixed(1)),
        status: getStatus(calcLtPower, ltCurrent, ltVoltage, ltFrequency)
      });
    }

    return records;
  }, []);

  // Enhanced polling function with proper state handling and duplicate prevention
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

          // Filter to only use modbus service
          const filteredServices = services.filter(service => 
            service.name === 'modbus'
          );

          if (filteredServices.length > 0) {
            // Process modbus data and extract energy readings
            const { energyReadings, timestamp } = processModbusData(filteredServices);

            // Update metrics with current readings
            updateMetrics(energyReadings);

            // Create energy data records for table
            const newEnergyRecords = createEnergyRecord(energyReadings, timestamp);

            if (newEnergyRecords.length > 0) {
              // Update energy data - prevent duplicates by checking IDs
              setEnergyData(prev => {
                const existingIds = new Set(prev.map(item => item.id));
                const uniqueNewRecords = newEnergyRecords.filter(record => !existingIds.has(record.id));
                
                if (uniqueNewRecords.length > 0) {
                  // Keep last 50 records for smoother charts
                  return [...uniqueNewRecords, ...prev].slice(0, 50);
                }
                return prev;
              });
            }

            setApiStatus(`${mode === 'polling' ? 'Polling' : 'Realtime'} - Modbus service active`);
          } else {
            setApiStatus('No modbus service data available');
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
  }, [isLoading, mode, processModbusData, updateMetrics, createEnergyRecord]);

  // WebSocket connection for realtime mode
  const connectWebSocket = useCallback(() => {
    try {
      setApiStatus('Connecting to WebSocket...');
      
      // Simulate WebSocket with rapid polling for service data
      setIsConnected(true);
      setApiStatus('Simulated WebSocket - Modbus Data');
      
      fetchData(); // Initial fetch
      pollingRef.current = setInterval(fetchData, 2000); // Reduced to 2 seconds for realtime
      
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
    // Filter logic would be implemented here
  }, [filters]);

  const handleResetFilters = useCallback(() => {
    setFilters({
      crane: 'all',
      motor: 'all',
      date: 'today',
      metric: 'power'
    });
  }, []);

  return (
    <>
      <div className="page-title">
        <h1>Energy Monitoring</h1>
        <p>Real-time energy consumption from modbus service</p>
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

      <EnergyMetrics metrics={metrics} />

      <Filter 
        filters={filterConfig}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />

      <EnergyCharts energyData={energyData} />

      <EnergyTable energyData={energyData} />
    </>
  );
};

export default EnergyMonitoring;