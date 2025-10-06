import React from 'react';

const StatusFilter = ({ activeFilter, onFilterChange }) => {
  const filters = [
    { key: 'all', icon: 'fas fa-list', label: 'All Cranes' },
    { key: 'working', icon: 'fas fa-hard-hat', label: 'Working' },
    { key: 'idle', icon: 'fas fa-pause-circle', label: 'Idle' },
    { key: 'off', icon: 'fas fa-power-off', label: 'Off' },
    { key: 'overload', icon: 'fas fa-weight-hanging', label: 'Overload' },
    { key: 'error', icon: 'fas fa-exclamation-triangle', label: 'Errors' }
  ];

  return (
    <div className="status-filter-bar">
      {filters.map(filter => (
        <div
          key={filter.key}
          className={`status-filter ${filter.key} ${activeFilter === filter.key ? 'active' : ''}`}
          onClick={() => onFilterChange(filter.key)}
        >
          <i className={filter.icon}></i>
          <span>{filter.label}</span>
        </div>
      ))}
    </div>
  );
};

export default StatusFilter;