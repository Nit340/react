// pages/OperationsLog.js
import React, { useState, useEffect } from 'react';
import OperationsMetrics from '../components/OperationsLog/OperationsMetrics';
import Filter from '../components/Filter';
import OperationsTable from '../components/OperationsLog/OperationsTable';

const OperationsLog = () => {
  const [filters, setFilters] = useState({
    crane: 'all',
    type: 'all',
    date: 'all'
  });
  const [operationsData, setOperationsData] = useState([]);
  const [metrics, setMetrics] = useState({
    hoist: { total: 0, up: 0, down: 0 },
    ct: { total: 0, left: 0, right: 0 },
    lt: { total: 0, forward: 0, reverse: 0 },
    switch: 0,
    duration: '8:42:15',
    load: '287.5T'
  });

  // Filter configuration for OperationsLog
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
        { value: 'lt-reverse', label: 'LT Reverse' },
        { value: 'switch', label: 'Switching' }
      ]
    },
    {
      key: 'date',
      label: 'Date Range',
      type: 'select',
      value: filters.date,
      options: [
        { value: 'all', label: 'All Dates' },
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' }
      ]
    }
  ];

  // Initialize operations data
  useEffect(() => {
    const initialData = [
      {
        id: 1,
        timestamp: '2023-06-15 08:23:45',
        craneId: 'CRN-001',
        operation: 'hoist-up',
        duration: '2:15',
        load: '3,250'
      },
      // ... rest of your data
    ];

    setOperationsData(initialData);
    updateMetrics(initialData);
  }, []);

  const updateMetrics = (data) => {
    // ... same updateMetrics function as before
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const handleApplyFilters = () => {
    console.log('Applying filters:', filters);
    // Here you would typically filter your data based on the filters
  };

  const handleResetFilters = () => {
    setFilters({
      crane: 'all',
      type: 'all',
      date: 'all'
    });
  };

  return (
    <>
      <div className="page-title">
        <h1>Operations Log</h1>
        <p>Complete record of all crane operations</p>
      </div>

      <OperationsMetrics metrics={metrics} />

      <Filter 
        filters={filterConfig}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />

      <OperationsTable operations={operationsData} />
    </>
  );
};

export default OperationsLog;