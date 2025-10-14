import React from 'react';
import { useNavigate } from 'react-router-dom';

const CraneGrid = ({ craneData, activeFilter }) => {
  const navigate = useNavigate();
  
  // If no crane data, show empty state
  if (Object.keys(craneData).length === 0) {
    return (
      <div className="status-grid">
        <div className="no-cranes-message">
          <i className="fas fa-crane"></i>
          <h3>No Crane Data Available</h3>
          <p>Waiting for data from backend...</p>
        </div>
      </div>
    );
  }

  const filteredCranes = Object.entries(craneData).filter(([id, crane]) => 
    activeFilter === 'all' || crane.status.toLowerCase() === activeFilter
  );

  // If filter results in no cranes, show message
  if (filteredCranes.length === 0) {
    return (
      <div className="status-grid">
        <div className="no-cranes-message">
          <i className="fas fa-filter"></i>
          <h3>No Cranes Match Filter</h3>
          <p>No cranes with status: {activeFilter}</p>
        </div>
      </div>
    );
  }

  const handleCraneClick = (craneId, crane) => {
    // Navigate to crane details page with crane data as parameters
    navigate('/crane-details', { 
      state: {
        craneId: craneId,
        craneName: crane.name,
        craneStatus: crane.status,
        craneData: crane
      }
    });
  };

  return (
    <div className="status-grid">
      {filteredCranes.map(([id, crane]) => (
        <div 
          key={id} 
          className="status-card" 
          data-status={crane.status.toLowerCase()}
          onClick={() => handleCraneClick(id, crane)}
          style={{ cursor: 'pointer' }}
        >
          <div className="status-card-header">
            <div>
              <div className="crane-name">{crane.name}</div>
              <div className="crane-id">ID: {id}</div>
            </div>
            <div className={`status-badge status-${crane.status.toLowerCase()}`}>
              {crane.status}
            </div>
          </div>
          <div className="status-card-body">
            <div className="status-metric">
              <div className="metric-label">Current Load</div>
              <div className="metric-value">{crane.load}</div>
            </div>
            <div className="status-metric">
              <div className="metric-label">Capacity</div>
              <div className="metric-value">{crane.capacity}</div>
            </div>
            <div className="status-metric">
              <div className="metric-label">Health</div>
              <div className="metric-value">{crane.health}</div>
            </div>
            <div className="status-metric">
              <div className="metric-label">Power</div>
              <div className="metric-value">{crane.power} kW</div>
            </div>
            <div className="status-metric">
              <div className="metric-label">Current</div>
              <div className="metric-value">{crane.current} A</div>
            </div>
          </div>
          <div className="status-card-footer">
            <div className="last-updated">Updated {crane.updated}</div>
            <div className="view-details">
              <span>Click for Details</span>
              <i className="fas fa-chevron-right"></i>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CraneGrid;