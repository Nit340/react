// pages/Load.js
import React, { useState, useEffect } from 'react';
import LoadMetrics from '../components/Load/LoadMetrics';
import Filter from '../components/Filter';
import LoadChart from '../components/Load/LoadChart';
import LoadTable from '../components/Load/LoadTable';

const Load = () => {
  const [filters, setFilters] = useState({
    crane: 'all',
    status: 'all',
    date: 'today'
  });
  const [metrics, setMetrics] = useState({
    currentLoad: '4,250',
    averageCapacity: '72',
    maxCapacity: '6,800',
    overallStatus: 'N/A'
  });
  const [loadData, setLoadData] = useState([]);

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

  // Initialize load data
  useEffect(() => {
    const initialData = [
      {
        id: 1,
        timestamp: '2023-06-15 08:23:45',
        craneId: 'CRN-001',
        operation: 'Hoist Up',
        load: '3,250',
        capacity: '5,000',
        percentage: '65%',
        status: 'normal'
      },
      {
        id: 2,
        timestamp: '2023-06-15 08:45:12',
        craneId: 'CRN-002',
        operation: 'CT Right',
        load: '4,800',
        capacity: '10,000',
        percentage: '48%',
        status: 'normal'
      },
      {
        id: 3,
        timestamp: '2023-06-15 10:05:27',
        craneId: 'CRN-004',
        operation: 'Hoist Up',
        load: '5,700',
        capacity: '6,000',
        percentage: '95%',
        status: 'warning'
      },
      {
        id: 4,
        timestamp: '2023-06-15 11:15:06',
        craneId: 'CRN-005',
        operation: 'LT Forward',
        load: '7,500',
        capacity: '8,000',
        percentage: '94%',
        status: 'warning'
      },
      {
        id: 5,
        timestamp: '2023-06-15 13:18:37',
        craneId: 'CRN-003',
        operation: 'Hoist Up',
        load: '6,200',
        capacity: '5,000',
        percentage: '124%',
        status: 'overload'
      },
      {
        id: 6,
        timestamp: '2023-06-14 07:15:22',
        craneId: 'CRN-002',
        operation: 'Hoist Down',
        load: '3,800',
        capacity: '10,000',
        percentage: '38%',
        status: 'normal'
      },
      {
        id: 7,
        timestamp: '2023-06-14 09:22:18',
        craneId: 'CRN-001',
        operation: 'CT Left',
        load: '4,200',
        capacity: '5,000',
        percentage: '84%',
        status: 'normal'
      },
      {
        id: 8,
        timestamp: '2023-06-14 11:30:07',
        craneId: 'CRN-004',
        operation: 'Hoist Down',
        load: '6,100',
        capacity: '6,000',
        percentage: '102%',
        status: 'overload'
      },
      {
        id: 9,
        timestamp: '2023-06-14 14:05:19',
        craneId: 'CRN-005',
        operation: 'LT Reverse',
        load: '1,800',
        capacity: '8,000',
        percentage: '23%',
        status: 'normal'
      },
      {
        id: 10,
        timestamp: '2023-06-13 08:10:33',
        craneId: 'CRN-003',
        operation: 'Hoist Up',
        load: '4,500',
        capacity: '5,000',
        percentage: '90%',
        status: 'warning'
      }
    ];

    setLoadData(initialData);
    updateMetrics(initialData);
  }, []);

  const updateMetrics = (data) => {
    // Calculate metrics based on data
    const totalLoad = data.reduce((sum, item) => {
      const load = parseFloat(item.load.replace(',', '')) || 0;
      return sum + load;
    }, 0);
    
    const avgCapacity = data.reduce((sum, item) => {
      const percentage = parseFloat(item.percentage) || 0;
      return sum + percentage;
    }, 0) / data.length;

    const maxLoad = Math.max(...data.map(item => parseFloat(item.load.replace(',', '')) || 0));

    setMetrics({
      currentLoad: '4,250', // This would come from real-time data
      averageCapacity: avgCapacity.toFixed(0),
      maxCapacity: maxLoad.toLocaleString(),
      overallStatus: data.some(item => item.status === 'overload') ? 'Overload Detected' : 'N/A'
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
      status: 'all',
      date: 'today'
    });
  };

  return (
    <>
      <div className="page-title">
        <h1>Load Lift Log</h1>
        <p>Records of all load weight measurements</p>
      </div>

      <LoadMetrics metrics={metrics} />

      <Filter 
        filters={filterConfig}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />

      <LoadChart />

      <LoadTable loadData={loadData} />
    </>
  );
};

export default Load;