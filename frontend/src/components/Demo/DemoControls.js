// components/Demo/DemoControls.js
import React from 'react';

const DemoControls = ({ 
  mode, 
  pollingInterval, 
  onModeChange, 
  onIntervalChange,
  onSimulateData 
}) => {
  return (
    <div className="demo-controls">
      <div className="control-group">
        <label>Data Mode:</label>
        <div className="mode-buttons">
          <button
            className={mode === 'polling' ? 'active' : ''}
            onClick={() => onModeChange('polling')}
          >
            Polling Mode
          </button>
          <button
            className={mode === 'realtime' ? 'active' : ''}
            onClick={() => onModeChange('realtime')}
          >
            Real-time Mode
          </button>
        </div>
      </div>

      {mode === 'polling' && (
        <div className="control-group">
          <label>Polling Interval:</label>
          <select 
            value={pollingInterval} 
            onChange={(e) => onIntervalChange(Number(e.target.value))}
          >
            <option value={500}>0.5 seconds</option>
            <option value={1000}>1 second</option>
            <option value={2000}>2 seconds</option>
            <option value={5000}>5 seconds</option>
          </select>
        </div>
      )}

      {mode === 'realtime' && (
        <div className="control-group">
          <div className="realtime-info">
            <span className="realtime-badge">⚡ Real-time Active</span>
            <span className="interval-info">Updates every 300ms</span>
          </div>
        </div>
      )}

      <div className="control-group">
        <button onClick={onSimulateData} className="simulate-btn">
          Simulate Test Data
        </button>
      </div>

      <style jsx>{`
        .demo-controls {
          display: flex;
          gap: 20px;
          align-items: center;
          background: white;
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .control-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        label {
          font-weight: 600;
          color: #2c3e50;
          white-space: nowrap;
        }
        
        .mode-buttons {
          display: flex;
          gap: 5px;
        }
        
        .mode-buttons button {
          padding: 8px 16px;
          border: 2px solid #e9ecef;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .mode-buttons button.active {
          background: #1976d2;
          color: white;
          border-color: #1976d2;
        }
        
        .mode-buttons button:hover:not(.active) {
          border-color: #1976d2;
        }
        
        select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }
        
        .realtime-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .realtime-badge {
          background: #28a745;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .interval-info {
          font-size: 12px;
          color: #6c757d;
        }
        
        .simulate-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .simulate-btn:hover {
          background: #5a6268;
        }
      `}</style>
    </div>
  );
};

export default DemoControls;