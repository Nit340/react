// components/Common/Filter.js
import React from 'react';

const Filter = ({ 
  filters = [],
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  showActions = true,
  className = ''
}) => {
  const handleFilterChange = (filterKey, value) => {
    if (onFilterChange) {
      onFilterChange(filterKey, value);
    }
  };

  const handleApply = () => {
    if (onApplyFilters) {
      onApplyFilters();
    }
  };

  const handleReset = () => {
    if (onResetFilters) {
      onResetFilters();
    }
  };

  return (
    <div className={`filter-controls ${className}`}>
      <div className="filter-grid">
        {filters.map((filter) => (
          <div key={filter.key} className="filter-group">
            <label className="filter-label">{filter.label}</label>
            {filter.type === 'select' ? (
              <select
                className="filter-select"
                value={filter.value || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              >
                {filter.options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : filter.type === 'input' ? (
              <input
                type="text"
                className="filter-input"
                value={filter.value || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                placeholder={filter.placeholder}
              />
            ) : filter.type === 'date' ? (
              <input
                type="date"
                className="filter-input"
                value={filter.value || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              />
            ) : null}
          </div>
        ))}
        
        {showActions && (
          <div className="filter-actions">
            <button className="btn btn-primary" onClick={handleApply}>
              <i className="fas fa-filter"></i>
              Apply Filters
            </button>
            <button className="btn btn-secondary" onClick={handleReset}>
              <i className="fas fa-redo"></i>
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Filter;