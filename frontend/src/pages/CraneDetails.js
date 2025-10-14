import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const CraneDetails = () => {
  const location = useLocation();
  const { state } = location;
  
  // Get crane data from navigation state or use defaults
  const craneId = state?.craneId || 'CRN-001';
  const craneName = state?.craneName || 'Gantry Crane';
  const craneStatus = state?.craneStatus || 'No Data';
  const initialCraneData = state?.craneData || {};
  
  const [craneData, setCraneData] = useState(initialCraneData);
  const [historicalData, setHistoricalData] = useState([]);
  const [motorStatus, setMotorStatus] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('1h');

  // Parse timestamp function
  const parseTimestamp = (timestampStr) => {
    try {
      if (timestampStr.includes('Z')) {
        return new Date(timestampStr);
      }
      return new Date(timestampStr);
    } catch (error) {
      console.error('Error parsing timestamp:', timestampStr, error);
      return new Date();
    }
  };

  // Fetch detailed crane data
  const fetchCraneDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch assets from last 24 hours for detailed analysis
      const response = await fetch(`/api/database/assets?hours=24`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          processCraneDetails(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching crane details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [craneId]);

  const processCraneDetails = (assets) => {
    const now = new Date();
    const timeRanges = {
      '1h': new Date(now.getTime() - 1 * 60 * 60 * 1000),
      '6h': new Date(now.getTime() - 6 * 60 * 60 * 1000),
      '12h': new Date(now.getTime() - 12 * 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000)
    };

    const filteredAssets = assets.filter(asset => {
      const assetTime = parseTimestamp(asset.timestamp);
      return assetTime >= timeRanges[timeRange];
    });

    // Process for current status
    const latestAssets = {};
    assets.forEach(asset => {
      const assetTime = parseTimestamp(asset.timestamp);
      if (!latestAssets[asset.asset_id] || assetTime > parseTimestamp(latestAssets[asset.asset_id].timestamp)) {
        latestAssets[asset.asset_id] = asset;
      }
    });

    // Calculate motor running status
    const motorOperations = calculateMotorOperations(filteredAssets);
    const activeTime = calculateActiveTime(filteredAssets);
    
    setHistoricalData(filteredAssets);
    setMotorStatus(motorOperations);
    
    // Update crane data with latest information
    setCraneData(prev => ({
      ...prev,
      activeTime: activeTime,
      totalOperations: motorOperations.totalOperations,
      currentLoad: getLatestValue(latestAssets, 'Load'),
      maxLoad: getMaxValue(filteredAssets, 'Load'),
      avgLoad: getAverageValue(filteredAssets, 'Load'),
      currentPower: getLatestPower(latestAssets),
      currentCurrent: getLatestCurrent(latestAssets)
    }));
  };

  const calculateMotorOperations = (assets) => {
    const operations = {
      hoistUp: 0,
      hoistDown: 0,
      ctLeft: 0,
      ctRight: 0,
      ltForward: 0,
      ltReverse: 0,
      totalOperations: 0
    };

    let previousValues = {};

    // Sort assets by timestamp to process in chronological order
    const sortedAssets = [...assets].sort((a, b) => 
      parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
    );

    sortedAssets.forEach(asset => {
      if (asset.service === 'onboard_io') {
        const prevValue = previousValues[asset.asset_id] || 0;
        const currentValue = parseInt(asset.value) || 0;

        // Detect rising edge (0 -> 1)
        if (prevValue === 0 && currentValue === 1) {
          switch(asset.asset_id) {
            case 'Hoist_Up':
              operations.hoistUp++;
              break;
            case 'Hoist_Down':
              operations.hoistDown++;
              break;
            case 'Ct_Left':
              operations.ctLeft++;
              break;
            case 'Ct_Right':
              operations.ctRight++;
              break;
            case 'Lt_Forward':
              operations.ltForward++;
              break;
            case 'Lt_Reverse':
              operations.ltReverse++;
              break;
          }
        }
        previousValues[asset.asset_id] = currentValue;
      }
    });

    operations.totalOperations = operations.hoistUp + operations.hoistDown + operations.ctLeft + 
                                operations.ctRight + operations.ltForward + operations.ltReverse;
    return operations;
  };

  const calculateActiveTime = (assets) => {
    if (assets.length === 0) return 0;

    let totalActiveTime = 0;
    let lastActiveTime = null;
    const activeThreshold = 5 * 60 * 1000; // 5 minutes

    // Sort by timestamp
    const sortedAssets = [...assets].sort((a, b) => 
      parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
    );

    sortedAssets.forEach(asset => {
      const assetTime = parseTimestamp(asset.timestamp);
      
      // Consider crane active if there's any onboard_io operation or load > 0
      const isActive = asset.service === 'onboard_io' || 
                      (asset.asset_id === 'Load' && parseFloat(asset.value) > 0);

      if (isActive) {
        if (lastActiveTime === null) {
          lastActiveTime = assetTime;
        } else {
          const timeDiff = assetTime - lastActiveTime;
          if (timeDiff <= activeThreshold) {
            totalActiveTime += timeDiff;
          }
          lastActiveTime = assetTime;
        }
      }
    });

    return Math.round(totalActiveTime / (60 * 1000)); // Convert to minutes
  };

  const getLatestValue = (latestAssets, assetId) => {
    const asset = latestAssets[assetId];
    return asset ? parseFloat(asset.value) || 0 : 0;
  };

  const getLatestPower = (latestAssets) => {
    // Get power from any motor
    const powerAssets = Object.values(latestAssets).filter(asset => 
      asset.asset_id.includes('power') || asset.asset_id.includes('Power')
    );
    return powerAssets.length > 0 ? parseFloat(powerAssets[0].value) || 0 : 0;
  };

  const getLatestCurrent = (latestAssets) => {
    // Get current from any motor
    const currentAssets = Object.values(latestAssets).filter(asset => 
      asset.asset_id.includes('current') || asset.asset_id.includes('Current')
    );
    return currentAssets.length > 0 ? parseFloat(currentAssets[0].value) || 0 : 0;
  };

  const getMaxValue = (assets, assetId) => {
    const values = assets
      .filter(asset => asset.asset_id === assetId)
      .map(asset => parseFloat(asset.value) || 0);
    return values.length > 0 ? Math.max(...values) : 0;
  };

  const getAverageValue = (assets, assetId) => {
    const values = assets
      .filter(asset => asset.asset_id === assetId)
      .map(asset => parseFloat(asset.value) || 0);
    return values.length > 0 ? 
      values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  };

  const renderLoadChart = () => {
    const loadData = historicalData
      .filter(asset => asset.asset_id === 'Load')
      .slice(-20) // Last 20 readings
      .map(asset => ({
        time: parseTimestamp(asset.timestamp).toLocaleTimeString(),
        load: parseFloat(asset.value) || 0,
        timestamp: parseTimestamp(asset.timestamp)
      }));

    // Sort by timestamp
    loadData.sort((a, b) => a.timestamp - b.timestamp);

    const maxLoad = 5000; // Capacity

    return (
      <div className="chart-container">
        <h4>Load Over Time</h4>
        <div className="chart">
          {loadData.map((point, index) => (
            <div key={index} className="chart-bar-container">
              <div 
                className="chart-bar" 
                style={{ 
                  height: `${(point.load / maxLoad) * 100}%`,
                  backgroundColor: point.load > 4500 ? '#e74c3c' : point.load > 4000 ? '#f39c12' : '#2ecc71'
                }}
                title={`${point.time}: ${point.load} kg`}
              ></div>
              <div className="chart-label">{point.time.split(':').slice(0, 2).join(':')}</div>
            </div>
          ))}
        </div>
        {loadData.length === 0 && (
          <div className="no-data-message">No load data available</div>
        )}
      </div>
    );
  };

  const renderMotorOperationsChart = () => {
    const operations = [
      { name: 'Hoist Up', count: motorStatus.hoistUp || 0, color: '#3498db' },
      { name: 'Hoist Down', count: motorStatus.hoistDown || 0, color: '#2980b9' },
      { name: 'CT Left', count: motorStatus.ctLeft || 0, color: '#e74c3c' },
      { name: 'CT Right', count: motorStatus.ctRight || 0, color: '#c0392b' },
      { name: 'LT Forward', count: motorStatus.ltForward || 0, color: '#27ae60' },
      { name: 'LT Reverse', count: motorStatus.ltReverse || 0, color: '#229954' }
    ];

    const maxCount = Math.max(...operations.map(op => op.count), 1);

    return (
      <div className="chart-container">
        <h4>Motor Operations</h4>
        <div className="operations-chart">
          {operations.map((op, index) => (
            <div key={index} className="operation-bar-container">
              <div 
                className="operation-bar" 
                style={{ 
                  height: `${(op.count / maxCount) * 100}%`,
                  backgroundColor: op.color
                }}
                title={`${op.name}: ${op.count} operations`}
              >
                <span className="operation-count">{op.count}</span>
              </div>
              <div className="operation-label">{op.name.split(' ')[0]}</div>
            </div>
          ))}
        </div>
        <div className="chart-footer">
          Total Operations: {motorStatus.totalOperations || 0}
        </div>
      </div>
    );
  };

  const renderPowerChart = () => {
    const powerData = historicalData
      .filter(asset => asset.service === 'modbus' && asset.asset_id.includes('power'))
      .slice(-15) // Last 15 readings
      .map(asset => ({
        time: parseTimestamp(asset.timestamp).toLocaleTimeString(),
        power: parseFloat(asset.value) || 0,
        motor: asset.asset_id.replace('_power', '').replace('_', ' ').replace('Power', '')
      }));

    // Group by motor type
    const motorData = {};
    powerData.forEach(point => {
      if (!motorData[point.motor]) {
        motorData[point.motor] = [];
      }
      motorData[point.motor].push(point);
    });

    return (
      <div className="chart-container">
        <h4>Power Consumption</h4>
        <div className="power-chart">
          {Object.entries(motorData).map(([motor, data]) => (
            <div key={motor} className="motor-power">
              <h5>{motor}</h5>
              <div className="power-bars">
                {data.map((point, index) => (
                  <div key={index} className="power-bar-container">
                    <div 
                      className="power-bar" 
                      style={{ height: `${Math.min(point.power * 10, 100)}%` }}
                      title={`${point.time}: ${point.power} kW`}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(motorData).length === 0 && (
            <div className="no-data-message">No power data available</div>
          )}
        </div>
      </div>
    );
  };

  const renderActivityTimeline = () => {
    const activityData = historicalData
      .filter(asset => asset.service === 'onboard_io' || asset.asset_id === 'Load')
      .slice(-10)
      .map(asset => ({
        time: parseTimestamp(asset.timestamp).toLocaleTimeString(),
        type: asset.service === 'onboard_io' ? 'Operation' : 'Load',
        description: asset.service === 'onboard_io' ? 
          `${asset.asset_id.replace('_', ' ')}` : 
          `Load: ${asset.value} kg`,
        value: asset.value
      }));

    return (
      <div className="chart-container">
        <h4>Recent Activity</h4>
        <div className="activity-timeline">
          {activityData.map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-time">{activity.time}</div>
              <div className="activity-type">{activity.type}</div>
              <div className="activity-description">{activity.description}</div>
            </div>
          ))}
          {activityData.length === 0 && (
            <div className="no-data-message">No recent activity</div>
          )}
        </div>
      </div>
    );
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchCraneDetails();
    const interval = setInterval(() => {
      fetchCraneDetails();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchCraneDetails, timeRange]);

  return (
    <div className="crane-details-page">
      <div className="page-title">
        <h1>{craneName} Details</h1>
        <p>ID: {craneId} • Status: <span className={`status-badge status-${craneStatus.toLowerCase()}`}>{craneStatus}</span></p>
      </div>

      {/* Time Range Selector */}
      <div className="time-range-selector">
        <label>Time Range: </label>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
          <option value="1h">Last 1 Hour</option>
          <option value="6h">Last 6 Hours</option>
          <option value="12h">Last 12 Hours</option>
          <option value="24h">Last 24 Hours</option>
        </select>
        {isLoading && <span className="loading-text">🔄 Updating...</span>}
      </div>

      {/* Key Metrics */}
      <div className="key-metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-value">{craneData.activeTime || 0}</div>
          <div className="metric-label">Active Time (min)</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">⚡</div>
          <div className="metric-value">{craneData.totalOperations || 0}</div>
          <div className="metric-label">Total Operations</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-value">{craneData.currentLoad ? craneData.currentLoad.toFixed(0) : 0}</div>
          <div className="metric-label">Current Load (kg)</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-value">{craneData.maxLoad ? craneData.maxLoad.toFixed(0) : 0}</div>
          <div className="metric-label">Max Load (kg)</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">🔋</div>
          <div className="metric-value">{craneData.currentPower ? craneData.currentPower.toFixed(1) : 0}</div>
          <div className="metric-label">Power (kW)</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">🔌</div>
          <div className="metric-value">{craneData.currentCurrent ? craneData.currentCurrent.toFixed(1) : 0}</div>
          <div className="metric-label">Current (A)</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {renderLoadChart()}
        {renderMotorOperationsChart()}
        {renderPowerChart()}
        {renderActivityTimeline()}
      </div>

      {/* Raw Data Table */}
      <div className="raw-data-section">
        <h3>Recent Data Points ({historicalData.length} total)</h3>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Service</th>
                <th>Asset</th>
                <th>Value</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {historicalData.slice(-10).map((asset, index) => (
                <tr key={index}>
                  <td>{parseTimestamp(asset.timestamp).toLocaleTimeString()}</td>
                  <td className={`service-${asset.service}`}>{asset.service}</td>
                  <td>{asset.asset_id}</td>
                  <td>{asset.value}</td>
                  <td>{asset.unit || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {historicalData.length === 0 && (
            <div className="no-data-message">No data available for selected time range</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .crane-details-page {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .page-title h1 {
          color: #2c3e50;
          margin-bottom: 5px;
        }
        
        .page-title p {
          color: #7f8c8d;
          font-size: 16px;
        }
        
        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .status-active { background: #d4edda; color: #155724; }
        .status-idle { background: #fff3cd; color: #856404; }
        .status-no.data { background: #f8d7da; color: #721c24; }
        
        .time-range-selector {
          margin: 20px 0;
          padding: 15px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .time-range-selector label {
          font-weight: 600;
          color: #2c3e50;
        }
        
        .time-range-selector select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }
        
        .loading-text {
          color: #3498db;
          font-size: 14px;
        }
        
        .key-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        
        .metric-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: transform 0.2s ease;
        }
        
        .metric-card:hover {
          transform: translateY(-2px);
        }
        
        .metric-icon {
          font-size: 24px;
          margin-bottom: 10px;
        }
        
        .metric-value {
          font-size: 28px;
          font-weight: bold;
          color: #2c3e50;
        }
        
        .metric-label {
          color: #7f8c8d;
          font-size: 14px;
          margin-top: 5px;
        }
        
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }
        
        .chart-container {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .chart-container h4 {
          margin: 0 0 15px 0;
          color: #2c3e50;
          border-bottom: 2px solid #ecf0f1;
          padding-bottom: 10px;
        }
        
        .chart {
          display: flex;
          height: 200px;
          align-items: end;
          gap: 5px;
          padding: 10px 0;
        }
        
        .chart-bar-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }
        
        .chart-bar {
          width: 20px;
          background: #3498db;
          border-radius: 3px 3px 0 0;
          transition: height 0.3s ease;
          min-height: 5px;
        }
        
        .chart-label {
          font-size: 10px;
          margin-top: 5px;
          color: #7f8c8d;
          transform: rotate(-45deg);
          white-space: nowrap;
        }
        
        .operations-chart {
          display: flex;
          height: 200px;
          align-items: end;
          gap: 10px;
          padding: 10px 0;
        }
        
        .operation-bar-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }
        
        .operation-bar {
          width: 40px;
          border-radius: 5px 5px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          min-height: 30px;
        }
        
        .operation-count {
          color: white;
          font-weight: bold;
          font-size: 12px;
        }
        
        .operation-label {
          font-size: 11px;
          margin-top: 5px;
          text-align: center;
          color: #7f8c8d;
        }
        
        .chart-footer {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #ecf0f1;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .power-chart {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .motor-power h5 {
          margin: 0 0 10px 0;
          color: #2c3e50;
          text-transform: capitalize;
        }
        
        .power-bars {
          display: flex;
          height: 60px;
          align-items: end;
          gap: 3px;
        }
        
        .power-bar-container {
          flex: 1;
        }
        
        .power-bar {
          background: #9b59b6;
          border-radius: 2px 2px 0 0;
          min-height: 5px;
        }
        
        .activity-timeline {
          max-height: 300px;
          overflow-y: auto;
        }
        
        .activity-item {
          display: flex;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid #ecf0f1;
          gap: 15px;
        }
        
        .activity-item:last-child {
          border-bottom: none;
        }
        
        .activity-time {
          font-size: 12px;
          color: #7f8c8d;
          min-width: 80px;
        }
        
        .activity-type {
          background: #e3f2fd;
          color: #1976d2;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          min-width: 80px;
          text-align: center;
        }
        
        .activity-description {
          flex: 1;
          color: #2c3e50;
        }
        
        .raw-data-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-top: 30px;
        }
        
        .data-table {
          overflow-x: auto;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ecf0f1;
        }
        
        th {
          background: #f8f9fa;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .service-onboard_io { color: #e74c3c; font-weight: 600; }
        .service-LoadCell { color: #3498db; font-weight: 600; }
        .service-modbus { color: #27ae60; font-weight: 600; }
        
        .no-data-message {
          text-align: center;
          padding: 40px;
          color: #7f8c8d;
          font-style: italic;
        }
        
        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
          
          .key-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default CraneDetails;