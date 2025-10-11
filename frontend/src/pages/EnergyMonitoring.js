// pages/EnergyMonitoring.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import EnergyMetrics from '../components/EnergyMonitoring/EnergyMetrics';
import Filter from '../components/Filter';
import EnergyCharts from '../components/EnergyMonitoring/EnergyCharts';
import EnergyTable from '../components/EnergyMonitoring/EnergyTable';
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
  const [showCharts, setShowCharts] = useState(false); // Start with charts hidden

  // Mode state
  const [mode, setMode] = useState('polling');
  const [pollingInterval, setPollingInterval] = useState(5000);
  const [isLoading, setIsLoading] = useState(false);
  
  const ws = useRef(null);
  const pollingRef = useRef(null);

  // CSS Styles
  const styles = {
    pageContainer: {
      padding: '20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    },
    pageTitle: {
      marginBottom: '30px',
      padding: '25px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
      borderLeft: '5px solid #3498db'
    },
    pageTitleH1: {
      margin: '0 0 8px 0',
      fontSize: '2.2rem',
      fontWeight: '700',
      color: '#2c3e50',
      background: 'linear-gradient(135deg, #3498db 0%, #2c3e50 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    pageSubtitle: {
      margin: '0',
      fontSize: '1.1rem',
      color: '#7f8c8d',
      fontWeight: '400'
    },
    chartsSection: {
      marginBottom: '30px',
      transition: 'all 0.3s ease'
    }
  };

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
    const motorData = {
      hoist: { voltage: 0, current: 0, power: 0, frequency: 0 },
      ct: { voltage: 0, current: 0, power: 0, frequency: 0 },
      lt: { voltage: 0, current: 0, power: 0, frequency: 0 }
    };
    
    let timestamp = new Date().toISOString();

    // Find modbus service
    const modbusService = serviceArray.find(service => service.name === 'modbus');
    if (modbusService) {
      modbusService.assets.forEach(asset => {
        const { id, value, timestamp: assetTimestamp } = asset;
        
        // Map datapoints to specific motors
        switch(id) {
          case 'Hoist_voltage':
            motorData.hoist.voltage = parseFloat(value) || 0;
            break;
          case 'Hoist_current':
            motorData.hoist.current = parseFloat(value) || 0;
            break;
          case 'Hoist_power':
            motorData.hoist.power = parseFloat(value) || 0;
            break;
          case 'Hoist_frequency':
            motorData.hoist.frequency = parseFloat(value) || 0;
            break;
          case 'Ct_voltage':
            motorData.ct.voltage = parseFloat(value) || 0;
            break;
          case 'Ct_current':
            motorData.ct.current = parseFloat(value) || 0;
            break;
          case 'Ct_power':
            motorData.ct.power = parseFloat(value) || 0;
            break;
          case 'Ct_frequency':
            motorData.ct.frequency = parseFloat(value) || 0;
            break;
          case 'Lt_voltage':
            motorData.lt.voltage = parseFloat(value) || 0;
            break;
          case 'Lt_current':
            motorData.lt.current = parseFloat(value) || 0;
            break;
          case 'Lt_power':
            motorData.lt.power = parseFloat(value) || 0;
            break;
          case 'Lt_frequency':
            motorData.lt.frequency = parseFloat(value) || 0;
            break;
        }
        
        if (assetTimestamp) {
          timestamp = assetTimestamp;
        }
      });
    }

    return { motorData, timestamp };
  }, []);

  // More accurate electrical calculations
  const updateMetrics = useCallback((motorData) => {
    const { hoist, ct, lt } = motorData;

    // Calculate actual power if not provided
    const hoistPower = hoist.power > 0 ? hoist.power : (hoist.voltage * hoist.current * 0.85) / 1000;
    const ctPower = ct.power > 0 ? ct.power : (ct.voltage * ct.current * 0.85) / 1000;
    const ltPower = lt.power > 0 ? lt.power : (lt.voltage * lt.current * 0.85) / 1000;
    
    const actualTotalPower = hoistPower + ctPower + ltPower;

    // ENERGY COST CALCULATION
    const electricityRate = 0.15; // $0.15 per kWh
    const operatingHours = 8; // Assume 8-hour operation day
    const dailyEnergy = actualTotalPower * operatingHours; // kWh per day
    const energyCost = dailyEnergy * electricityRate;

    // EFFICIENCY CALCULATION
    const totalApparentPower = (hoist.voltage * hoist.current + ct.voltage * ct.current + lt.voltage * lt.current) / 1000; // kVA
    const powerFactor = totalApparentPower > 0 ? actualTotalPower / totalApparentPower : 0;
    
    // Efficiency based on power factor and load
    let efficiency = 0;
    if (actualTotalPower > 0) {
      const loadFactor = Math.min(1, actualTotalPower / 50);
      const baseEfficiency = 85 + (loadFactor * 10);
      const powerFactorPenalty = (1 - powerFactor) * 10;
      efficiency = Math.max(75, Math.min(95, baseEfficiency - powerFactorPenalty));
    }

    // ENERGY PER TON CALCULATION
    const assumedLoad = 25; // Assume 25-ton average load
    const energyPerTon = actualTotalPower > 0 ? (dailyEnergy / assumedLoad).toFixed(1) : 0;

    setMetrics({
      totalPower: `${actualTotalPower.toFixed(1)} kW`,
      energyCost: `$${energyCost.toFixed(2)}`,
      efficiency: `${efficiency.toFixed(0)}%`,
      energyPerTon: `${energyPerTon} kWh/T`
    });
  }, []);

  // Create individual records for each motor with actual data
  const createEnergyRecord = useCallback((motorData, timestamp) => {
    const { hoist, ct, lt } = motorData;

    // Determine status based on values
    const getStatus = (motor) => {
      const { power, current, voltage, frequency } = motor;
      const powerFactor = voltage > 0 && current > 0 ? (power * 1000) / (voltage * current) : 0.85;
      
      if (current === 0 && power === 0) return 'offline';
      if (power > 20 || current > 35 || powerFactor < 0.7) return 'warning';
      if (power > 15 || current > 25 || Math.abs(frequency - 50) > 2) return 'normal';
      return 'efficient';
    };

    const records = [];
    const electricityRate = 0.15; // $0.15 per kWh
    const operatingTime = 0.5; // Assume 30 minutes operation per record

    // Create unique timestamp for base time
    const baseTime = new Date(timestamp);
    
    // Create records for each motor type that has data
    const motors = [
      { 
        type: 'Hoist', 
        data: hoist,
        offset: 1 
      },
      { 
        type: 'CT', 
        data: ct,
        offset: 2 
      },
      { 
        type: 'LT', 
        data: lt,
        offset: 3 
      }
    ];

    motors.forEach((motor) => {
      const { type, data, offset } = motor;
      const { voltage, current, power, frequency } = data;
      
      // Only create record if we have some data for this motor
      if (voltage > 0 || current > 0 || power > 0) {
        const uniqueTime = new Date(baseTime.getTime() + offset);
        const calcPower = power > 0 ? power : (voltage * current * 0.85) / 1000;
        
        records.push({
          id: `${type.toLowerCase()}_${baseTime.getTime()}_${offset}`,
          timestamp: baseTime.toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
          }).replace(/(\d+)\/(\d+)\/(\d+),?/, '$3-$1-$2'),
          craneId: 'CRN-001',
          motorType: type,
          power: parseFloat(calcPower.toFixed(1)),
          current: parseFloat(current.toFixed(1)),
          voltage: parseFloat(voltage.toFixed(0)),
          energy: parseFloat((calcPower * operatingTime).toFixed(1)),
          cost: parseFloat(((calcPower * operatingTime) * electricityRate).toFixed(2)),
          frequency: parseFloat(frequency.toFixed(1)),
          status: getStatus(data)
        });
      }
    });

    return records;
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

          // Filter to only use modbus service
          const filteredServices = services.filter(service => 
            service.name === 'modbus'
          );

          if (filteredServices.length > 0) {
            // Process modbus data and extract motor readings
            const { motorData, timestamp } = processModbusData(filteredServices);

            // Update metrics with current readings
            updateMetrics(motorData);

            // Create energy data records for table - only for motors with data
            const newEnergyRecords = createEnergyRecord(motorData, timestamp);

            if (newEnergyRecords.length > 0) {
              // Update energy data - prevent duplicates by checking IDs
              setEnergyData(prev => {
                const existingIds = new Set(prev.map(item => item.id));
                const uniqueNewRecords = newEnergyRecords.filter(record => !existingIds.has(record.id));
                
                if (uniqueNewRecords.length > 0) {
                  // Keep last 100 records to ensure we have enough data for the table
                  return [...uniqueNewRecords, ...prev].slice(0, 100);
                }
                return prev;
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, processModbusData, updateMetrics, createEnergyRecord]);

  // WebSocket connection for realtime mode
  const connectWebSocket = useCallback(() => {
    try {
      // Simulate WebSocket with rapid polling for service data
      fetchData(); // Initial fetch
      pollingRef.current = setInterval(fetchData, 2000); // Reduced to 2 seconds for realtime
    } catch (error) {
      console.error('WebSocket connection failed:', error);
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
    setShowCharts(true); // Show charts when Apply Filters is clicked
  }, [filters]);

  const handleResetFilters = useCallback(() => {
    setFilters({
      crane: 'all',
      motor: 'all',
      date: 'today',
      metric: 'power'
    });
    setShowCharts(false); // Hide charts when Reset is clicked
  }, []);

  return (
    <div style={styles.pageContainer}>
      <div style={styles.pageTitle}>
        <h1 style={styles.pageTitleH1}>Energy Monitoring</h1>
        <p style={styles.pageSubtitle}>Real-time energy consumption from modbus service</p>
      </div>

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

      {/* Show charts above table only when showCharts is true */}
      {showCharts && (
        <div style={styles.chartsSection}>
          <EnergyCharts energyData={energyData} />
        </div>
      )}

      {/* Always show the table */}
      <EnergyTable energyData={energyData} />
    </div>
  );
};

export default EnergyMonitoring;