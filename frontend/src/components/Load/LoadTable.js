
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

  return (
    <div className="log-table-container">
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
          {loadData.length > 0 ? (
            loadData.map(item => (
              <tr key={item.id}>
                <td>{item.timestamp}</td>
                <td>{item.craneId}</td>
                <td>{item.operation}</td>
                <td>{item.load.toLocaleString()}</td>
                <td>{item.capacity.toLocaleString()}</td>
                <td>{item.percentage}%</td>
                <td>
                  <span className={`load-status ${getStatusClass(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="no-data">
                No load data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LoadTable;
