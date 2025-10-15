import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// Simple SVG-based chart components
const LineChart = ({ data, width = 400, height = 200, color = '#3498db', title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h4>{title}</h4>
        <div className="no-data">No data available</div>
      </div>
    );
  }

  const values = data.map(d => d.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const xStep = width / (data.length - 1);

  const points = data.map((point, index) => {
    const x = index * xStep;
    const y = height - ((point.value - minValue) / (maxValue - minValue)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="chart-container">
      <h4>{title}</h4>
      <div className="chart-wrapper">
        <svg width={width} height={height} className="line-chart">
          {/* Grid lines */}
          <g className="grid">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line
                key={i}
                x1="0"
                y1={height * ratio}
                x2={width}
                y2={height * ratio}
                stroke="#ecf0f1"
                strokeWidth="1"
              />
            ))}
          </g>
          
          {/* Line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="3"
            points={points}
          />
          
          {/* Data points */}
          {data.map((point, index) => {
            const x = index * xStep;
            const y = height - ((point.value - minValue) / (maxValue - minValue)) * height;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill={color}
                stroke="#fff"
                strokeWidth="2"
              />
            );
          })}
          
          {/* Labels */}
          <text x="10" y="15" fill="#7f8c8d" fontSize="12">
            Max: {maxValue.toFixed(1)}
          </text>
          <text x={width - 50} y="15" fill="#7f8c8d" fontSize="12">
            Min: {minValue.toFixed(1)}
          </text>
        </svg>
        
        {/* X-axis labels */}
        <div className="x-axis">
          {data.map((point, index) => (
            <span key={index} className="x-label">
              {point.time}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const AreaChart = ({ data, width = 400, height = 200, color = '#9b59b6', title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h4>{title}</h4>
        <div className="no-data">No data available</div>
      </div>
    );
  }

  const values = data.map(d => d.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const xStep = width / (data.length - 1);

  const points = data.map((point, index) => {
    const x = index * xStep;
    const y = height - ((point.value - minValue) / (maxValue - minValue)) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${points} ${width},${height} 0,${height}`;

  return (
    <div className="chart-container">
      <h4>{title}</h4>
      <div className="chart-wrapper">
        <svg width={width} height={height} className="area-chart">
          {/* Grid */}
          <g className="grid">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line
                key={i}
                x1="0"
                y1={height * ratio}
                x2={width}
                y2={height * ratio}
                stroke="#ecf0f1"
                strokeWidth="1"
              />
            ))}
          </g>
          
          {/* Area */}
          <polygon
            fill={color}
            fillOpacity="0.3"
            stroke={color}
            strokeWidth="2"
            points={areaPoints}
          />
          
          {/* Line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
          />
          
          {/* Data points */}
          {data.map((point, index) => {
            const x = index * xStep;
            const y = height - ((point.value - minValue) / (maxValue - minValue)) * height;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={color}
                stroke="#fff"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        
        <div className="x-axis">
          {data.map((point, index) => (
            <span key={index} className="x-label">
              {point.time}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const BarChart = ({ data, width = 400, height = 200, color = '#e74c3c', title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h4>{title}</h4>
        <div className="no-data">No data available</div>
      </div>
    );
  }

  const values = data.map(d => d.value);
  const maxValue = Math.max(...values);
  const barWidth = (width - 20) / data.length;

  return (
    <div className="chart-container">
      <h4>{title}</h4>
      <div className="chart-wrapper">
        <svg width={width} height={height} className="bar-chart">
          {/* Grid */}
          <g className="grid">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line
                key={i}
                x1="0"
                y1={height * ratio}
                x2={width}
                y2={height * ratio}
                stroke="#ecf0f1"
                strokeWidth="1"
              />
            ))}
          </g>
          
          {/* Bars */}
          {data.map((point, index) => {
            const barHeight = (point.value / maxValue) * (height - 30);
            const x = index * barWidth + 10;
            const y = height - barHeight;
            
            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth - 5}
                  height={barHeight}
                  fill={color}
                  rx="2"
                />
                <text
                  x={x + (barWidth - 5) / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#7f8c8d"
                >
                  {point.value.toFixed(0)}
                </text>
              </g>
            );
          })}
        </svg>
        
        <div className="x-axis">
          {data.map((point, index) => (
            <span key={index} className="x-label">
              {point.time}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const GaugeChart = ({ value, max = 100, width = 200, height = 120, color = '#27ae60', title, unit = '' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="gauge-container">
      <h4>{title}</h4>
      <div className="gauge-wrapper">
        <svg width={width} height={height} className="gauge-chart">
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={height / 2}
            r={radius}
            fill="none"
            stroke="#ecf0f1"
            strokeWidth="8"
          />
          
          {/* Value circle */}
          <circle
            cx={width / 2}
            cy={height / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${width / 2} ${height / 2})`}
          />
          
          {/* Value text */}
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            dy="0.3em"
            fontSize="20"
            fontWeight="bold"
            fill="#2c3e50"
          >
            {value.toFixed(1)}{unit}
          </text>
          
          {/* Label */}
          <text
            x={width / 2}
            y={height / 2 + 25}
            textAnchor="middle"
            fontSize="12"
            fill="#7f8c8d"
          >
            {percentage.toFixed(1)}%
          </text>
        </svg>
      </div>
    </div>
  );
};

// Main Component
const CraneDetails = () => {
  const location = useLocation();
  const { state } = location;
  
  const craneId = state?.craneId || 'CRN-001';
  const craneName = state?.craneName || 'Gantry Crane';
  const craneStatus = state?.craneStatus || 'No Data';
  
  const [historicalData, setHistoricalData] = useState([]);
  const [realTimeData, setRealTimeData] = useState({});
  const [chartData, setChartData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('6h');
  const [refreshInterval, setRefreshInterval] = useState(10000);

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

  const fetchAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '12h' ? 12 : 24;
      const response = await fetch(`/api/database/assets?hours=${hours}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          processAllData(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  const processAllData = (assets) => {
    setHistoricalData(assets);
    
    // Process real-time values
    const realTimeValues = calculateRealTimeValues(assets);
    setRealTimeData(realTimeValues);
    
    // Process chart data
    const charts = {
      loadChart: prepareLoadChartData(assets),
      powerChart: preparePowerChartData(assets),
      currentChart: prepareCurrentChartData(assets),
      operationsChart: prepareOperationsChartData(assets),
      efficiencyChart: prepareEfficiencyChartData(assets)
    };
    
    setChartData(charts);
  };

  // Real-time calculations
  const calculateRealTimeValues = (assets) => {
    const latestValues = {};
    assets.forEach(asset => {
      const assetKey = asset.asset_id;
      const currentTime = parseTimestamp(asset.timestamp);
      
      if (!latestValues[assetKey] || currentTime > parseTimestamp(latestValues[assetKey].timestamp)) {
        latestValues[assetKey] = asset;
      }
    });

    const recentData = assets.filter(asset => 
      parseTimestamp(asset.timestamp) > new Date(Date.now() - 5 * 60 * 1000)
    );

    return {
      currentLoad: getLatestValue(latestValues, 'Load'),
      currentPower: getLatestPower(latestValues),
      currentCurrent: getLatestCurrent(latestValues),
      totalOperations: calculateTotalOperations(assets),
      efficiency: calculateEfficiency(assets),
      activeMotors: getActiveMotors(latestValues),
      status: getCraneStatus(latestValues, recentData),
      lastUpdate: new Date().toLocaleTimeString(),
      dataPoints: assets.length
    };
  };

  // Chart data preparation
  const prepareLoadChartData = (assets) => {
    const loadData = assets
      .filter(asset => asset.asset_id === 'Load' && parseFloat(asset.value) > 0)
      .slice(-20) // Last 20 points for better visualization
      .map(asset => ({
        time: formatChartTime(parseTimestamp(asset.timestamp)),
        value: parseFloat(asset.value),
        timestamp: parseTimestamp(asset.timestamp)
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return loadData;
  };

  const preparePowerChartData = (assets) => {
    const powerData = assets
      .filter(asset => (asset.asset_id.includes('power') || asset.asset_id.includes('Power')) && parseFloat(asset.value) > 0)
      .slice(-15)
      .map(asset => ({
        time: formatChartTime(parseTimestamp(asset.timestamp)),
        value: parseFloat(asset.value),
        timestamp: parseTimestamp(asset.timestamp)
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return powerData;
  };

  const prepareCurrentChartData = (assets) => {
    const currentData = assets
      .filter(asset => (asset.asset_id.includes('current') || asset.asset_id.includes('Current')) && parseFloat(asset.value) > 0)
      .slice(-15)
      .map(asset => ({
        time: formatChartTime(parseTimestamp(asset.timestamp)),
        value: parseFloat(asset.value),
        timestamp: parseTimestamp(asset.timestamp)
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return currentData;
  };

  const prepareOperationsChartData = (assets) => {
    const hourlyOps = calculateHourlyOperations(assets);
    return hourlyOps.map(hour => ({
      time: `${hour.hour}:00`,
      value: hour.operations
    }));
  };

  const prepareEfficiencyChartData = (assets) => {
    // Simulate efficiency data points
    const efficiencyData = [];
    for (let i = 0; i < 10; i++) {
      efficiencyData.push({
        time: `${i * 2}:00`,
        value: Math.random() * 100
      });
    }
    return efficiencyData;
  };

  // Helper functions
  const getLatestValue = (latestValues, assetId) => {
    const asset = Object.values(latestValues).find(a => a.asset_id === assetId);
    return asset ? parseFloat(asset.value) || 0 : 0;
  };

  const getLatestPower = (latestValues) => {
    const powerAssets = Object.values(latestValues).filter(asset => 
      asset.asset_id.includes('power') || asset.asset_id.includes('Power')
    );
    return powerAssets.length > 0 ? parseFloat(powerAssets[0].value) || 0 : 0;
  };

  const getLatestCurrent = (latestValues) => {
    const currentAssets = Object.values(latestValues).filter(asset => 
      asset.asset_id.includes('current') || asset.asset_id.includes('Current')
    );
    return currentAssets.length > 0 ? parseFloat(currentAssets[0].value) || 0 : 0;
  };

  const calculateTotalOperations = (assets) => {
    const operations = calculateMotorOperations(assets);
    return operations.totalOperations;
  };

  const calculateMotorOperations = (assets) => {
    const operations = {
      hoistUp: 0, hoistDown: 0, ctLeft: 0, ctRight: 0, ltForward: 0, ltReverse: 0, totalOperations: 0
    };

    let previousValues = {};
    const sortedAssets = [...assets].sort((a, b) => 
      parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
    );

    sortedAssets.forEach(asset => {
      if (asset.service === 'onboard_io') {
        const assetKey = `${asset.service}.${asset.asset_id}`;
        const prevValue = previousValues[assetKey] || 0;
        const currentValue = parseFloat(asset.value) || 0;

        if (prevValue === 0 && currentValue === 1) {
          switch(asset.asset_id) {
            case 'Hoist_Up': operations.hoistUp++; break;
            case 'Hoist_Down': operations.hoistDown++; break;
            case 'Ct_Left': operations.ctLeft++; break;
            case 'Ct_Right': operations.ctRight++; break;
            case 'Lt_Forward': operations.ltForward++; break;
            case 'Lt_Reverse': operations.ltReverse++; break;
          }
        }
        previousValues[assetKey] = currentValue;
      }
    });

    operations.totalOperations = operations.hoistUp + operations.hoistDown + operations.ctLeft + 
                                operations.ctRight + operations.ltForward + operations.ltReverse;
    return operations;
  };

  const calculateHourlyOperations = (assets) => {
    const hourlyOps = {};
    assets.forEach(asset => {
      if (asset.service === 'onboard_io') {
        const hour = parseTimestamp(asset.timestamp).getHours();
        hourlyOps[hour] = (hourlyOps[hour] || 0) + 1;
      }
    });

    return Object.entries(hourlyOps).map(([hour, operations]) => ({
      hour: parseInt(hour),
      operations: operations
    })).sort((a, b) => a.hour - b.hour);
  };

  const calculateEfficiency = (assets) => {
    const activeTime = calculateActiveTime(assets);
    const totalTime = 60; // Last hour in minutes
    const operations = calculateTotalOperations(assets);
    
    const utilization = totalTime > 0 ? (activeTime / totalTime) * 100 : 0;
    const operationDensity = activeTime > 0 ? operations / activeTime : 0;
    
    return Math.min(100, (utilization * 0.6 + Math.min(operationDensity * 10, 40)));
  };

  const calculateActiveTime = (assets) => {
    if (assets.length === 0) return 0;
    let totalActiveTime = 0;
    let lastActiveTime = null;
    const activeThreshold = 5 * 60 * 1000;

    const sortedAssets = [...assets].sort((a, b) => 
      parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
    );

    sortedAssets.forEach(asset => {
      const assetTime = parseTimestamp(asset.timestamp);
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

    return Math.round(totalActiveTime / (60 * 1000));
  };

  const getActiveMotors = (latestValues) => {
    const motorAssets = Object.values(latestValues).filter(asset => 
      asset.service === 'onboard_io' && parseFloat(asset.value) === 1
    );
    return motorAssets.map(asset => asset.asset_id);
  };

  const getCraneStatus = (latestValues, recentData) => {
    const activeMotors = getActiveMotors(latestValues);
    const currentLoad = getLatestValue(latestValues, 'Load');
    
    if (activeMotors.length > 0) return 'Active';
    if (currentLoad > 0) return 'Loaded';
    if (recentData.length > 0) return 'Idle';
    return 'No Data';
  };

  const formatChartTime = (timestamp) => {
    return `${timestamp.getHours()}:${timestamp.getMinutes().toString().padStart(2, '0')}`;
  };

  // Auto-refresh
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => {
      fetchAllData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchAllData, refreshInterval, timeRange]);

  return (
    <div className="crane-details-page">
      <div className="page-title">
        <h1>{craneName} - Real-time Dashboard</h1>
        <p>ID: {craneId} • Status: <span className={`status-badge status-${realTimeData.status?.toLowerCase() || 'unknown'}`}>
          {realTimeData.status}
        </span></p>
      </div>

      {/* Controls */}
      <div className="controls-panel">
        <div className="time-range-selector">
          <label>Time Range: </label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="1h">Last 1 Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="12h">Last 12 Hours</option>
            <option value="24h">Last 24 Hours</option>
          </select>
        </div>
        
        <div className="refresh-control">
          <label>Refresh: </label>
          <select value={refreshInterval} onChange={(e) => setRefreshInterval(parseInt(e.target.value))}>
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
          </select>
        </div>

        {isLoading && <span className="loading-text">🔄 Updating charts...</span>}
        <div className="data-info">Last update: {realTimeData.lastUpdate}</div>
      </div>

      {/* Real-time Metrics */}
      <div className="metrics-grid">
        <div className="metric-card large">
          <div className="metric-title">Current Load</div>
          <div className="metric-value">{realTimeData.currentLoad?.toFixed(0) || 0} kg</div>
          <div className="metric-subtitle">Live Weight</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-title">Power</div>
          <div className="metric-value">{realTimeData.currentPower?.toFixed(1) || 0} kW</div>
          <div className="metric-subtitle">Consumption</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-title">Current</div>
          <div className="metric-value">{realTimeData.currentCurrent?.toFixed(1) || 0} A</div>
          <div className="metric-subtitle">Electrical</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-title">Operations</div>
          <div className="metric-value">{realTimeData.totalOperations || 0}</div>
          <div className="metric-subtitle">Total</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-title">Active Motors</div>
          <div className="metric-value">{realTimeData.activeMotors?.length || 0}</div>
          <div className="metric-subtitle">Currently Running</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <LineChart 
          data={chartData.loadChart} 
          title="Load Over Time" 
          color="#3498db"
          width={500}
          height={250}
        />
        
        <AreaChart 
          data={chartData.powerChart} 
          title="Power Consumption" 
          color="#9b59b6"
          width={500}
          height={250}
        />
        
        <LineChart 
          data={chartData.currentChart} 
          title="Current Usage" 
          color="#e74c3c"
          width={500}
          height={250}
        />
        
        <BarChart 
          data={chartData.operationsChart} 
          title="Hourly Operations" 
          color="#f39c12"
          width={500}
          height={250}
        />
        
        <GaugeChart 
          value={realTimeData.efficiency || 0}
          title="Efficiency"
          color="#27ae60"
          unit="%"
        />
      </div>

      <style jsx>{`
        .crane-details-page {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
          background: #f8f9fa;
        }
        
        .page-title {
          background: white;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .page-title h1 {
          color: #2c3e50;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        
        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .status-active { background: #d4edda; color: #155724; }
        .status-loaded { background: #fff3cd; color: #856404; }
        .status-idle { background: #d1ecf1; color: #0c5460; }
        .status-no.data { background: #f8d7da; color: #721c24; }
        
        .controls-panel {
          display: flex;
          gap: 20px;
          align-items: center;
          margin: 20px 0;
          padding: 20px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .data-info {
          margin-left: auto;
          color: #7f8c8d;
          font-size: 14px;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        
        .metric-card {
          background: white;
          padding: 25px;
          border-radius: 10px;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          transition: transform 0.2s ease;
        }
        
        .metric-card:hover {
          transform: translateY(-2px);
        }
        
        .metric-card.large {
          grid-column: span 2;
        }
        
        .metric-title {
          color: #7f8c8d;
          font-size: 14px;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .metric-value {
          font-size: 32px;
          font-weight: bold;
          color: #2c3e50;
          margin: 10px 0;
        }
        
        .metric-subtitle {
          color: #95a5a6;
          font-size: 12px;
        }
        
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }
        
        .chart-container, .gauge-container {
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .chart-container h4, .gauge-container h4 {
          margin: 0 0 20px 0;
          color: #2c3e50;
          border-bottom: 2px solid #ecf0f1;
          padding-bottom: 10px;
        }
        
        .chart-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .x-axis {
          display: flex;
          justify-content: space-between;
          width: 100%;
          margin-top: 10px;
        }
        
        .x-label {
          font-size: 10px;
          color: #7f8c8d;
          transform: rotate(-45deg);
          transform-origin: left top;
        }
        
        .gauge-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 150px;
        }
        
        .no-data {
          text-align: center;
          padding: 60px 20px;
          color: #7f8c8d;
          font-style: italic;
          background: #f8f9fa;
          border-radius: 5px;
        }
        
        .loading-text {
          color: #3498db;
          font-size: 14px;
        }
        
        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
          
          .metrics-grid {
            grid-template-columns: 1fr;
          }
          
          .metric-card.large {
            grid-column: span 1;
          }
          
          .controls-panel {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
};

export default CraneDetails;