// components/EnergyMonitoring/EnergyTable.js
import React, { useState, useMemo } from 'react';

const EnergyTable = ({ energyData = [] }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [hoveredRow, setHoveredRow] = useState(null);

  const styles = {
    energyTable: {
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
      margin: '20px 0',
      overflow: 'hidden'
    },
    tableHeader: {
      padding: '20px 25px',
      borderBottom: '2px solid #f0f0f0',
      backgroundColor: '#fafafa'
    },
    tableTitle: {
      margin: '0 0 8px 0',
      fontSize: '1.5rem',
      fontWeight: '600',
      color: '#2c3e50'
    },
    tableInfo: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    recordCount: {
      fontSize: '0.9rem',
      color: '#7f8c8d',
      fontWeight: '500'
    },
    tableContainer: {
      overflowX: 'auto'
    },
    dataTable: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '0.9rem'
    },
    tableHead: {
      backgroundColor: '#34495e'
    },
    tableHeaderCell: {
      padding: '16px 12px',
      textAlign: 'left',
      borderBottom: '2px solid #2c3e50',
      color: 'white',
      fontWeight: '600',
      fontSize: '0.85rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      userSelect: 'none'
    },
    tableHeaderCellHover: {
      backgroundColor: '#2c3e50'
    },
    tableRow: {
      borderBottom: '1px solid #ecf0f1',
      transition: 'all 0.2s ease'
    },
    tableRowHover: {
      backgroundColor: '#f8f9fa',
      transform: 'scale(1.002)'
    },
    tableCell: {
      padding: '14px 12px',
      textAlign: 'left',
      borderBottom: '1px solid #ecf0f1'
    },
    motorBadge: {
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '0.8rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    motorHoist: {
      backgroundColor: '#e8f4fd',
      color: '#2980b9',
      border: '1px solid #3498db'
    },
    motorCT: {
      backgroundColor: '#eafaf1',
      color: '#27ae60',
      border: '1px solid #2ecc71'
    },
    motorLT: {
      backgroundColor: '#fef9e7',
      color: '#f39c12',
      border: '1px solid #f1c40f'
    },
    statusBadge: {
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '0.8rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    statusEfficient: {
      backgroundColor: '#d5f4e6',
      color: '#27ae60'
    },
    statusNormal: {
      backgroundColor: '#e8f4fd',
      color: '#3498db'
    },
    statusWarning: {
      backgroundColor: '#fdebd0',
      color: '#e67e22'
    },
    statusOffline: {
      backgroundColor: '#f2f3f4',
      color: '#7f8c8d'
    },
    sortIcon: {
      marginLeft: '5px',
      fontSize: '0.8rem'
    },
    noDataContent: {
      padding: '40px 20px',
      textAlign: 'center',
      color: '#95a5a6'
    },
    noDataIcon: {
      fontSize: '3rem',
      marginBottom: '15px',
      display: 'block'
    },
    numericCell: {
      fontFamily: "'Courier New', monospace",
      fontWeight: '600',
      color: '#2c3e50'
    },
    timestampCell: {
      fontFamily: "'Courier New', monospace",
      fontSize: '0.85rem',
      color: '#34495e'
    }
  };

  // Simply show the last 15 records without complex filtering
  const filteredData = energyData.slice(0, 15);

  // Sort data
  const sortedData = useMemo(() => {
    const sortableData = [...filteredData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle timestamp sorting
        if (sortConfig.key === 'timestamp') {
          aValue = new Date(a.timestamp.replace(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/, '$1/$2/$3 $4:$5:$6'));
          bValue = new Date(b.timestamp.replace(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/, '$1/$2/$3 $4:$5:$6'));
        }

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

        // Handle date values
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
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
      efficient: { label: 'Efficient', style: styles.statusEfficient },
      normal: { label: 'Normal', style: styles.statusNormal },
      warning: { label: 'Warning', style: styles.statusWarning },
      offline: { label: 'Offline', style: styles.statusOffline }
    };
    
    const config = statusConfig[status] || statusConfig.normal;
    return (
      <span style={{...styles.statusBadge, ...config.style}}>
        {config.label}
      </span>
    );
  };

  const getMotorBadge = (motorType) => {
    const motorStyles = {
      Hoist: styles.motorHoist,
      CT: styles.motorCT,
      LT: styles.motorLT
    };
    
    return (
      <span style={{...styles.motorBadge, ...motorStyles[motorType]}}>
        {motorType}
      </span>
    );
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <span style={styles.sortIcon}>↕️</span>;
    }
    return sortConfig.direction === 'asc' ? 
      <span style={styles.sortIcon}>⬆️</span> : 
      <span style={styles.sortIcon}>⬇️</span>;
  };

  return (
    <div style={styles.energyTable}>
      <div style={styles.tableHeader}>
      
        <div style={styles.tableInfo}>
          <span style={styles.recordCount}>
            Showing last {sortedData.length} LOG
          </span>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.dataTable}>
          <thead>
            <tr style={styles.tableHead}>
              <th 
                onClick={() => handleSort('timestamp')} 
                style={styles.tableHeaderCell}
                onMouseEnter={(e) => e.target.style.backgroundColor = styles.tableHeaderCellHover.backgroundColor}
                onMouseLeave={(e) => e.target.style.backgroundColor = styles.tableHead.backgroundColor}
              >
                Timestamp <SortIcon columnKey="timestamp" />
              </th>
              <th 
                onClick={() => handleSort('craneId')} 
                style={styles.tableHeaderCell}
                onMouseEnter={(e) => e.target.style.backgroundColor = styles.tableHeaderCellHover.backgroundColor}
                onMouseLeave={(e) => e.target.style.backgroundColor = styles.tableHead.backgroundColor}
              >
                Crane ID <SortIcon columnKey="craneId" />
              </th>
              <th 
                onClick={() => handleSort('motorType')} 
                style={styles.tableHeaderCell}
                onMouseEnter={(e) => e.target.style.backgroundColor = styles.tableHeaderCellHover.backgroundColor}
                onMouseLeave={(e) => e.target.style.backgroundColor = styles.tableHead.backgroundColor}
              >
                Motor Type <SortIcon columnKey="motorType" />
              </th>
              <th 
                onClick={() => handleSort('power')} 
                style={styles.tableHeaderCell}
                onMouseEnter={(e) => e.target.style.backgroundColor = styles.tableHeaderCellHover.backgroundColor}
                onMouseLeave={(e) => e.target.style.backgroundColor = styles.tableHead.backgroundColor}
              >
                Power (kW) <SortIcon columnKey="power" />
              </th>
              <th 
                onClick={() => handleSort('current')} 
                style={styles.tableHeaderCell}
                onMouseEnter={(e) => e.target.style.backgroundColor = styles.tableHeaderCellHover.backgroundColor}
                onMouseLeave={(e) => e.target.style.backgroundColor = styles.tableHead.backgroundColor}
              >
                Current (A) <SortIcon columnKey="current" />
              </th>
              <th 
                onClick={() => handleSort('voltage')} 
                style={styles.tableHeaderCell}
                onMouseEnter={(e) => e.target.style.backgroundColor = styles.tableHeaderCellHover.backgroundColor}
                onMouseLeave={(e) => e.target.style.backgroundColor = styles.tableHead.backgroundColor}
              >
                Voltage (V) <SortIcon columnKey="voltage" />
              </th>
              <th 
                onClick={() => handleSort('energy')} 
                style={styles.tableHeaderCell}
                onMouseEnter={(e) => e.target.style.backgroundColor = styles.tableHeaderCellHover.backgroundColor}
                onMouseLeave={(e) => e.target.style.backgroundColor = styles.tableHead.backgroundColor}
              >
                Energy (kWh) <SortIcon columnKey="energy" />
              </th>
              <th 
                onClick={() => handleSort('cost')} 
                style={styles.tableHeaderCell}
                onMouseEnter={(e) => e.target.style.backgroundColor = styles.tableHeaderCellHover.backgroundColor}
                onMouseLeave={(e) => e.target.style.backgroundColor = styles.tableHead.backgroundColor}
              >
                Cost ($) <SortIcon columnKey="cost" />
              </th>
              <th 
                onClick={() => handleSort('frequency')} 
                style={styles.tableHeaderCell}
                onMouseEnter={(e) => e.target.style.backgroundColor = styles.tableHeaderCellHover.backgroundColor}
                onMouseLeave={(e) => e.target.style.backgroundColor = styles.tableHead.backgroundColor}
              >
                Frequency (Hz) <SortIcon columnKey="frequency" />
              </th>
              <th 
                onClick={() => handleSort('status')} 
                style={styles.tableHeaderCell}
                onMouseEnter={(e) => e.target.style.backgroundColor = styles.tableHeaderCellHover.backgroundColor}
                onMouseLeave={(e) => e.target.style.backgroundColor = styles.tableHead.backgroundColor}
              >
                Status <SortIcon columnKey="status" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length > 0 ? (
              sortedData.map((record, index) => (
                <tr 
                  key={record.id} 
                  style={{
                    ...styles.tableRow,
                    ...(hoveredRow === index ? styles.tableRowHover : {})
                  }}
                  onMouseEnter={() => setHoveredRow(index)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={{...styles.tableCell, ...styles.timestampCell}}>{record.timestamp}</td>
                  <td style={styles.tableCell}>{record.craneId}</td>
                  <td style={styles.tableCell}>{getMotorBadge(record.motorType)}</td>
                  <td style={{...styles.tableCell, ...styles.numericCell}}>{record.power.toFixed(1)}</td>
                  <td style={{...styles.tableCell, ...styles.numericCell}}>{record.current.toFixed(1)}</td>
                  <td style={{...styles.tableCell, ...styles.numericCell}}>{record.voltage.toFixed(0)}</td>
                  <td style={{...styles.tableCell, ...styles.numericCell}}>{record.energy.toFixed(1)}</td>
                  <td style={{...styles.tableCell, ...styles.numericCell}}>${record.cost.toFixed(2)}</td>
                  <td style={{...styles.tableCell, ...styles.numericCell}}>{record.frequency.toFixed(1)}</td>
                  <td style={styles.tableCell}>{getStatusBadge(record.status)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" style={styles.tableCell}>
                  <div style={styles.noDataContent}>
                    <span style={styles.noDataIcon}>📊</span>
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