// pages/EnergyMonitoring.js
import React, { useState, useEffect } from 'react';
import EnergyMetrics from '../components/EnergyMonitoring/EnergyMetrics';
import Filter from '../components/Filter';
import EnergyCharts from '../components/EnergyMonitoring/EnergyCharts';
import EnergyTable from '../components/EnergyMonitoring/EnergyTable';

const EnergyMonitoring = () => {
  const [filters, setFilters] = useState({
    crane: 'all',
    motor: 'all',
    date: 'today',
    metric: 'power'
  });
  const [metrics, setMetrics] = useState({
    totalPower: '24.8 kW',
    energyCost: '$18.42',
    efficiency: '87%',
    energyPerTon: '1.2 kWh/T'
  });
  const [energyData, setEnergyData] = useState([]);

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
        { value: 'travel', label: 'Travel Motor' },
        { value: 'trolley', label: 'Trolley Motor' }
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

  // Initialize energy data
  useEffect(() => {
    const initialData = [
      {
        id: 1,
        timestamp: '2023-06-15 08:23:45',
        craneId: 'CRN-001',
        motorType: 'Hoist',
        power: 12.5,
        current: 28.2,
        voltage: 410,
        energy: 25.0,
        cost: 3.75,
        status: 'normal'
      },
      {
        id: 2,
        timestamp: '2023-06-15 08:45:12',
        craneId: 'CRN-002',
        motorType: 'Travel',
        power: 8.2,
        current: 18.5,
        voltage: 400,
        energy: 16.4,
        cost: 2.46,
        status: 'normal'
      },
      {
        id: 3,
        timestamp: '2023-06-15 09:12:33',
        craneId: 'CRN-001',
        motorType: 'Trolley',
        power: 7.0,
        current: 15.8,
        voltage: 410,
        energy: 14.0,
        cost: 2.10,
        status: 'normal'
      },
      {
        id: 4,
        timestamp: '2023-06-15 10:05:27',
        craneId: 'CRN-004',
        motorType: 'Hoist',
        power: 14.2,
        current: 32.0,
        voltage: 408,
        energy: 28.4,
        cost: 4.26,
        status: 'normal'
      },
      {
        id: 5,
        timestamp: '2023-06-15 10:45:52',
        craneId: 'CRN-002',
        motorType: 'Travel',
        power: 9.5,
        current: 21.4,
        voltage: 398,
        energy: 19.0,
        cost: 2.85,
        status: 'normal'
      },
      {
        id: 6,
        timestamp: '2023-06-15 11:15:06',
        craneId: 'CRN-005',
        motorType: 'Hoist',
        power: 15.0,
        current: 33.8,
        voltage: 405,
        energy: 30.0,
        cost: 4.50,
        status: 'warning'
      },
      {
        id: 7,
        timestamp: '2023-06-15 11:52:41',
        craneId: 'CRN-001',
        motorType: 'Travel',
        power: 10.2,
        current: 23.0,
        voltage: 395,
        energy: 20.4,
        cost: 3.06,
        status: 'warning'
      },
      {
        id: 8,
        timestamp: '2023-06-15 12:30:15',
        craneId: 'CRN-003',
        motorType: 'Trolley',
        power: 8.8,
        current: 19.8,
        voltage: 405,
        energy: 17.6,
        cost: 2.64,
        status: 'normal'
      },
      {
        id: 9,
        timestamp: '2023-06-15 13:18:37',
        craneId: 'CRN-004',
        motorType: 'Hoist',
        power: 14.8,
        current: 33.3,
        voltage: 403,
        energy: 29.6,
        cost: 4.44,
        status: 'normal'
      },
      {
        id: 10,
        timestamp: '2023-06-15 14:05:22',
        craneId: 'CRN-002',
        motorType: 'Travel',
        power: 9.8,
        current: 22.1,
        voltage: 392,
        energy: 19.6,
        cost: 2.94,
        status: 'normal'
      }
    ];

    setEnergyData(initialData);
    updateMetrics(initialData);
  }, []);

  const updateMetrics = (data) => {
    // Calculate metrics based on data
    const totalPower = data.reduce((sum, item) => sum + item.power, 0);
    const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
    const avgEfficiency = 87; // This would be calculated from actual data
    const avgEnergyPerTon = 1.2; // This would be calculated from actual data

    setMetrics({
      totalPower: `${totalPower.toFixed(1)} kW`,
      energyCost: `$${totalCost.toFixed(2)}`,
      efficiency: `${avgEfficiency}%`,
      energyPerTon: `${avgEnergyPerTon} kWh/T`
    });
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const handleApplyFilters = () => {
    console.log('Applying filters:', filters);
    // Filter logic would go here
  };

  const handleResetFilters = () => {
    setFilters({
      crane: 'all',
      motor: 'all',
      date: 'today',
      metric: 'power'
    });
  };

  return (
    <>
      <div className="page-title">
        <h1>Energy Monitoring</h1>
        <p>Comprehensive energy consumption analysis and power metrics</p>
      </div>

      <EnergyMetrics metrics={metrics} />

      <Filter 
        filters={filterConfig}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />

      <EnergyCharts />

      <EnergyTable energyData={energyData} />
    </>
  );
};

export default EnergyMonitoring;