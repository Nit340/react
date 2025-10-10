// components/EnergyMonitoring/EnergyTable.js
import React, { useState, useMemo } from 'react';

const EnergyTable = ({ energyData = [] }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  // Filter to show only distinct values and last 12 records
  const getFilteredData = () => {
    const distinctData = [];
    const seenValues = new Set();
    
    // Process data in chronological order to ensure no important events are missed
    for (let i = energyData.length - 1; i >= 0; i--) {
      const item = energyData[i];
      
      // For warning or offline status, always show them regardless of duplicate values
      const isImportantEvent = item.status === 'warning' || 
                              item.status === 'offline';
      
      // Create a unique key - be more lenient for important events
      const valueKey = isImportantEvent ? 
        `${item.power}-${item.current}-${item.voltage}-${item.status}-${item.timestamp}` : // Include timestamp for important events
        `${item.power}-${item.current}-${item.voltage}-${item.status}`;
      
      // Only add if we haven't seen this combination before, or if it's an important event
      if (!seenValues.has(valueKey) || isImportantEvent) {
        if (!isImportantEvent) {
          seenValues.add(valueKey);
        }
        distinctData.unshift(item); // Add to beginning to maintain chronological order
        
        // Stop when we have 12 distinct records
        if (distinctData.length >= 12 && !isImportantEvent) break;
      }
    }
    
    // If we have important events, make sure we show at least 12 records
    if (distinctData.length < 12) {
      const additionalNeeded = 12 - distinctData.length;
      for (let i = energyData.length - 1; i >= 0 && additionalNeeded > 0; i--) {
        const item = energyData[i];
        if (!distinctData.find(existing => existing.id === item.id)) {
          distinctData.unshift(item);
        }
      }
    }
    
    return distinctData.slice(-12); // Ensure we only return last 12
  };

  const filteredData = getFilteredData();

  // Sort data
  const sortedData = useMemo(() => {
    const sortableData = [...filteredData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle numeric values
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Handle string values
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
          if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
          }
        }

        return 0;
      });
    }
    return sortableData;
  }, [filteredData, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      efficient: { label: 'Efficient', className: 'status-efficient' },
      normal: { label: 'Normal', className: 'status-normal' },
      warning: { label: 'Warning', className: 'status-warning' },
      offline: { label: 'Offline', className: 'status-offline' }
    };
    
    const config = statusConfig[status] || statusConfig.normal;
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <span className="sort-icon">↕️</span>;
    }
    return sortConfig.direction === 'asc' ? 
      <span className="sort-icon">⬆️</span> : 
      <span className="sort-icon">⬇️</span>;
  };

  return (
    <div className="energy-table">
      <div className="table-header">
        <h2>Energy Data Records</h2>
        <div className="table-info">
          <span className="record-count">
            Showing last {sortedData.length} distinct energy records
          </span>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th 
                onClick={() => handleSort('timestamp')} 
                className="sortable"
                style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', cursor: 'pointer' }}
              >
                Timestamp <SortIcon columnKey="timestamp" />
              </th>
              <th 
                onClick={() => handleSort('craneId')} 
                className="sortable"
                style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', cursor: 'pointer' }}
              >
                Crane ID <SortIcon columnKey="craneId" />
              </th>
              <th 
                onClick={() => handleSort('motorType')} 
                className="sortable"
                style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', cursor: 'pointer' }}
              >
                Motor Type <SortIcon columnKey="motorType" />
              </th>
              <th 
                onClick={() => handleSort('power')} 
                className="sortable"
                style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', cursor: 'pointer' }}
              >
                Power (kW) <SortIcon columnKey="power" />
              </th>
              <th 
                onClick={() => handleSort('current')} 
                className="sortable"
                style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', cursor: 'pointer' }}
              >
                Current (A) <SortIcon columnKey="current" />
              </th>
              <th 
                onClick={() => handleSort('voltage')} 
                className="sortable"
                style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', cursor: 'pointer' }}
              >
                Voltage (V) <SortIcon columnKey="voltage" />
              </th>
              <th 
                onClick={() => handleSort('energy')} 
                className="sortable"
                style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', cursor: 'pointer' }}
              >
                Energy (kWh) <SortIcon columnKey="energy" />
              </th>
              <th 
                onClick={() => handleSort('cost')} 
                className="sortable"
                style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', cursor: 'pointer' }}
              >
                Cost ($) <SortIcon columnKey="cost" />
              </th>
              <th 
                onClick={() => handleSort('frequency')} 
                className="sortable"
                style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', cursor: 'pointer' }}
              >
                Frequency (Hz) <SortIcon columnKey="frequency" />
              </th>
              <th 
                onClick={() => handleSort('status')} 
                className="sortable"
                style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', cursor: 'pointer' }}
              >
                Status <SortIcon columnKey="status" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length > 0 ? (
              sortedData.map((record) => (
                <tr key={record.id} className="data-row" style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', textAlign: 'left' }}>{record.timestamp}</td>
                  <td style={{ padding: '12px', textAlign: 'left' }}>{record.craneId}</td>
                  <td style={{ padding: '12px', textAlign: 'left' }}>
                    <span className={`motor-badge motor-${record.motorType.toLowerCase()}`}>
                      {record.motorType}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'left' }}>{record.power.toFixed(1)}</td>
                  <td style={{ padding: '12px', textAlign: 'left' }}>{record.current.toFixed(1)}</td>
                  <td style={{ padding: '12px', textAlign: 'left' }}>{record.voltage.toFixed(0)}</td>
                  <td style={{ padding: '12px', textAlign: 'left' }}>{record.energy.toFixed(1)}</td>
                  <td style={{ padding: '12px', textAlign: 'left' }}>${record.cost.toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'left' }}>{record.frequency.toFixed(1)}</td>
                  <td style={{ padding: '12px', textAlign: 'left' }}>{getStatusBadge(record.status)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" style={{ padding: '20px', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                  <div className="no-data-content">
                    <span className="no-data-icon">📊</span>
                    <p>No energy data available</p>
                    <small>Data will appear when modbus service is active</small>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EnergyTable;