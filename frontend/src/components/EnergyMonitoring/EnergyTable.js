// components/EnergyMonitoring/EnergyTable.js
import React from 'react';

const EnergyTable = ({ energyData }) => {
  const getStatusClass = (status) => {
    switch(status) {
      case 'normal': return 'status-normal';
      case 'warning': return 'status-warning';
      case 'danger': return 'status-danger';
      default: return 'status-normal';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'normal': return 'Normal';
      case 'warning': return 'High';
      case 'danger': return 'Critical';
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
            <th>Motor Type</th>
            <th>Power (kW)</th>
            <th>Current (A)</th>
            <th>Voltage (V)</th>
            <th>Energy (kWh)</th>
            <th>Cost ($)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {energyData.map(item => (
            <tr key={item.id}>
              <td>{item.timestamp}</td>
              <td>{item.craneId}</td>
              <td>{item.motorType}</td>
              <td>{item.power}</td>
              <td>{item.current}</td>
              <td>{item.voltage}</td>
              <td>{item.energy}</td>
              <td>{item.cost}</td>
              <td>
                <span className={`energy-status ${getStatusClass(item.status)}`}>
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

export default EnergyTable;