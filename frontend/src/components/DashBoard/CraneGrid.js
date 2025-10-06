import React from 'react';
import { useNavigate } from 'react-router-dom';

const CraneGrid = ({ craneData, activeFilter }) => {
  const navigate = useNavigate();
  
  const filteredCranes = Object.entries(craneData).filter(([id, crane]) => 
    activeFilter === 'all' || crane.status.toLowerCase() === activeFilter
  );

  const handleCraneClick = (craneId, crane) => {
    navigate(`/crane-details?id=${craneId}&status=${encodeURIComponent(crane.status)}&name=${encodeURIComponent(crane.name)}`);
  };

  return (
    <div className="status-grid">
      {filteredCranes.map(([id, crane]) => (
        <div 
          key={id} 
          className="status-card" 
          data-status={crane.status.toLowerCase()}
          onClick={() => handleCraneClick(id, crane)}
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
              <div className="metric-label">Device IDs</div>
              <div className="metric-value device-ids">
                {crane.devices.join(', ')}
              </div>
            </div>
            <div className="status-metric">
              <div className="metric-label">Health</div>
              <div className="metric-value">{crane.health}</div>
            </div>
          </div>
          <div className="status-card-footer">
            <div className="last-updated">Updated {crane.updated}</div>
            <div className="view-details">
              <span>Details</span>
              <i className="fas fa-chevron-right"></i>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CraneGrid;