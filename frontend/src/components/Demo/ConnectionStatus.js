// components/Demo/ConnectionStatus.js
import React from 'react';

const ConnectionStatus = ({ mode, isConnected, lastUpdate, onManualRefresh, apiStatus }) => {
  const getStatusColor = () => {
    if (!isConnected) return '#e74c3c';
    return mode === 'realtime' ? '#2ecc71' : '#3498db';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    return mode === 'realtime' ? 'Realtime (WebSocket)' : `Polling (${mode})`;
  };

  const formatTime = (date) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  return (
    <div className="connection-status">
      <div className="status-indicators">
        <div className="status-item">
          <div 
            className="status-dot"
            style={{ backgroundColor: getStatusColor() }}
          ></div>
          <span className="status-text">{getStatusText()}</span>
        </div>
        
        <div className="status-item">
          <i className="fas fa-clock"></i>
          <span className="status-text">
            Last update: {formatTime(lastUpdate)}
          </span>
        </div>

        {apiStatus && (
          <div className="status-item">
            <i className="fas fa-info-circle"></i>
            <span className="status-text">{apiStatus}</span>
          </div>
        )}

        {mode === 'polling' && (
          <button 
            className="btn btn-secondary btn-sm"
            onClick={onManualRefresh}
            disabled={!isConnected}
          >
            <i className="fas fa-sync-alt"></i>
            Refresh Now
          </button>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;