// components/Load/LoadTable.js
import React from 'react';

const LoadTable = ({ loadData }) => {
  const getStatusClass = (status) => {
    switch(status) {
      case 'normal': return 'status-normal';
      case 'warning': return 'status-warning';
      case 'overload': return 'status-danger';
      default: return 'status-normal';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'normal': return 'Normal';
      case 'warning': return 'Warning';
      case 'overload': return 'Overload';
      default: return status;
    }
  };

  const getOperationTypeClass = (operation) => {
    switch(operation) {
      case 'hoist-up': return 'type-hoist-up';
      case 'hoist-down': return 'type-hoist-down';
      case 'ct-left': return 'type-ct-left';
      case 'ct-right': return 'type-ct-right';
      case 'lt-forward': return 'type-lt-forward';
      case 'lt-reverse': return 'type-lt-reverse';
      default: return '';
    }
  };

  const getOperationLabel = (operation) => {
    switch(operation) {
      case 'hoist-up': return 'Hoist Up';
      case 'hoist-down': return 'Hoist Down';
      case 'ct-left': return 'CT Left';
      case 'ct-right': return 'CT Right';
      case 'lt-forward': return 'LT Forward';
      case 'lt-reverse': return 'LT Reverse';
      default: return operation;
    }
  };

  // Show message if no data
  if (loadData.length === 0) {
    return (
      <div className="log-table-container">
        <div className="no-data-message">
          <p>No crane operations recorded yet.</p>
          <p>Operations will appear here when crane movements are detected from onboard_io service.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="log-table-container">
      <div className="table-info">
        <p>Showing {loadData.length} crane operations with load metrics</p>
      </div>
      <table className="log-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Crane ID</th>
            <th>Operation</th>
            <th>Load (kg)</th>
            <th>Capacity</th>
            <th>Percentage</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loadData.map(item => (
            <tr key={item.id}>
              <td>{item.timestamp}</td>
              <td>{item.craneId}</td>
              <td>
                <span className={`operation-type ${getOperationTypeClass(item.operation)}`}>
                  {getOperationLabel(item.operation)}
                </span>
              </td>
              <td>{item.load.toLocaleString()}</td>
              <td>{item.capacity.toLocaleString()}</td>
              <td>{item.percentage}%</td>
              <td>
                <span className={`load-status ${getStatusClass(item.status)}`}>
                  {getStatusLabel(item.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LoadTable;