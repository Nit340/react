// components/OperationsLog/OperationsTable.js
import React from 'react';

const OperationsTable = ({ operations }) => {
  const getOperationTypeClass = (operation) => {
    switch(operation) {
      case 'hoist-up': return 'type-hoist-up';
      case 'hoist-down': return 'type-hoist-down';
      case 'ct-left': return 'type-ct-left';
      case 'ct-right': return 'type-ct-right';
      case 'lt-forward': return 'type-lt-forward';
      case 'lt-reverse': return 'type-lt-reverse';
      case 'switch': return 'type-switch';
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
      case 'switch': return 'Switch';
      default: return operation;
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
            <th>Duration</th>
            <th>Load (kg)</th>
          </tr>
        </thead>
        <tbody>
          {operations.map(operation => (
            <tr key={operation.id}>
              <td>{operation.timestamp}</td>
              <td>{operation.craneId}</td>
              <td>
                <span className={`operation-type ${getOperationTypeClass(operation.operation)}`}>
                  {getOperationLabel(operation.operation)}
                </span>
              </td>
              <td>{operation.duration}</td>
              <td>{operation.load}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OperationsTable;