// components/Demo/DemoControls.js
import React from 'react';

const DemoControls = ({ mode, pollingInterval, onModeChange, onIntervalChange }) => {
  const intervalOptions = [
    { value: 1000, label: '1 Second' },
    { value: 2000, label: '2 Seconds' },
    { value: 5000, label: '5 Seconds' },
    { value: 10000, label: '10 Seconds' }
  ];

  return (
    <div className="demo-controls">
      <div className="control-group">
        <label className="control-label">Data Mode</label>
        <div className="mode-buttons">
          <button
            className={`mode-btn ${mode === 'polling' ? 'active' : ''}`}
            onClick={() => onModeChange('polling')}
          >
            <i className="fas fa-sync-alt"></i>
            Polling Mode
          </button>
          <button
            className={`mode-btn ${mode === 'realtime' ? 'active' : ''}`}
            onClick={() => onModeChange('realtime')}
          >
            <i className="fas fa-bolt"></i>
            Realtime Mode
          </button>
        </div>
      </div>

      {mode === 'polling' && (
        <div className="control-group">
          <label className="control-label">Polling Interval</label>
          <select
            className="interval-select"
            value={pollingInterval}
            onChange={(e) => onIntervalChange(Number(e.target.value))}
          >
            {intervalOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="control-info">
        <i className="fas fa-info-circle"></i>
        <span>
          {mode === 'polling' 
            ? `Fetching data every ${pollingInterval/1000} seconds via HTTP GET`
            : 'Receiving real-time updates via WebSocket'
          }
        </span>
      </div>
    </div>
  );
};

export default DemoControls;