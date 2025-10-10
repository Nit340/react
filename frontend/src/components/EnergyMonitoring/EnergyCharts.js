// components/EnergyMonitoring/EnergyCharts.js
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const EnergyCharts = ({ energyData = [] }) => {
  const powerChartRef = useRef(null);
  const currentChartRef = useRef(null);
  const voltageChartRef = useRef(null);
  const efficiencyChartRef = useRef(null);
  const costChartRef = useRef(null);
  const energyLoadChartRef = useRef(null);

  const chartInstances = useRef([]);

  useEffect(() => {
    // Process real energy data for charts with stable data
    const processChartData = () => {
      // Get last 20 records for charts for better performance
      const recentData = energyData.slice(0, 20);
      
      // Sort by timestamp to ensure chronological order
      const sortedData = [...recentData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      const timeLabels = sortedData.map(item => {
        const date = new Date(item.timestamp);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      });

      const chartData = {
        hoist: {
          power: [],
          current: [],
          voltage: [],
          energy: [],
          cost: []
        },
        ct: {
          power: [],
          current: [],
          voltage: [],
          energy: [],
          cost: []
        },
        lt: {
          power: [],
          current: [],
          voltage: [],
          energy: [],
          cost: []
        }
      };

      // Group data by motor type with proper time alignment
      sortedData.forEach(item => {
        const dataPoint = {
          power: item.power,
          current: item.current,
          voltage: item.voltage,
          energy: parseFloat(item.energy),
          cost: parseFloat(item.cost)
        };

        switch(item.motorType) {
          case 'Hoist':
            chartData.hoist.power.push(dataPoint.power);
            chartData.hoist.current.push(dataPoint.current);
            chartData.hoist.voltage.push(dataPoint.voltage);
            chartData.hoist.energy.push(dataPoint.energy);
            chartData.hoist.cost.push(dataPoint.cost);
            break;
          case 'CT':
            chartData.ct.power.push(dataPoint.power);
            chartData.ct.current.push(dataPoint.current);
            chartData.ct.voltage.push(dataPoint.voltage);
            chartData.ct.energy.push(dataPoint.energy);
            chartData.ct.cost.push(dataPoint.cost);
            break;
          case 'LT':
            chartData.lt.power.push(dataPoint.power);
            chartData.lt.current.push(dataPoint.current);
            chartData.lt.voltage.push(dataPoint.voltage);
            chartData.lt.energy.push(dataPoint.energy);
            chartData.lt.cost.push(dataPoint.cost);
            break;
        }
      });

      return { timeLabels, chartData };
    };

    const { timeLabels, chartData } = processChartData();

    // Calculate stable efficiency from recent data
    const calculateEfficiency = () => {
      if (energyData.length === 0) return 87;
      
      // Use average of last 5 records for stability
      const recentRecords = energyData.slice(0, 5);
      if (recentRecords.length === 0) return 87;
      
      const avgPower = recentRecords.reduce((sum, item) => sum + item.power, 0) / recentRecords.length;
      const avgCurrent = recentRecords.reduce((sum, item) => sum + item.current, 0) / recentRecords.length;
      
      if (avgCurrent === 0) return 87;
      
      const avgVoltage = 400;
      const apparentPower = (avgVoltage * avgCurrent) / 1000;
      const powerFactor = apparentPower > 0 ? avgPower / apparentPower : 0.85;
      
      return Math.min(95, Math.max(75, 85 + (powerFactor * 8)));
    };

    const currentEfficiency = calculateEfficiency();

    // Destroy existing charts
    chartInstances.current.forEach(chart => chart && chart.destroy());
    chartInstances.current = [];

    // Power Consumption Chart
    if (powerChartRef.current && timeLabels.length > 0) {
      const ctx = powerChartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'Hoist Motor',
              data: chartData.hoist.power,
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#3498db',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4
            },
            {
              label: 'CT Motor',
              data: chartData.ct.power,
              borderColor: '#2ecc71',
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#2ecc71',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4
            },
            {
              label: 'LT Motor',
              data: chartData.lt.power,
              borderColor: '#f39c12',
              backgroundColor: 'rgba(243, 156, 18, 0.1)',
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#f39c12',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 15
              }
            },
            tooltip: { 
              mode: 'index', 
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 10,
              cornerRadius: 4
            }
          },
          scales: {
            y: { 
              beginAtZero: true,
              title: { 
                display: true, 
                text: 'Power (kW)',
                font: { weight: 'bold' }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            x: { 
              title: { 
                display: true, 
                text: 'Time',
                font: { weight: 'bold' }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            }
          },
          animation: {
            duration: 1000, // Smooth animation
            easing: 'easeOutQuart'
          }
        }
      });
      chartInstances.current.push(chart);
    }

    // Current Draw Chart
    if (currentChartRef.current && timeLabels.length > 0) {
      const ctx = currentChartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'Hoist Motor',
              data: chartData.hoist.current,
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#3498db',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4
            },
            {
              label: 'CT Motor',
              data: chartData.ct.current,
              borderColor: '#2ecc71',
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#2ecc71',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4
            },
            {
              label: 'LT Motor',
              data: chartData.lt.current,
              borderColor: '#f39c12',
              backgroundColor: 'rgba(243, 156, 18, 0.1)',
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#f39c12',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 15
              }
            },
            tooltip: { 
              mode: 'index', 
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 10,
              cornerRadius: 4
            }
          },
          scales: {
            y: { 
              beginAtZero: true,
              title: { 
                display: true, 
                text: 'Current (A)',
                font: { weight: 'bold' }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            x: { 
              title: { 
                display: true, 
                text: 'Time',
                font: { weight: 'bold' }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            }
          },
          animation: {
            duration: 1000,
            easing: 'easeOutQuart'
          }
        }
      });
      chartInstances.current.push(chart);
    }

    // Voltage Levels Chart
    if (voltageChartRef.current && timeLabels.length > 0) {
      const ctx = voltageChartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'Hoist Motor',
              data: chartData.hoist.voltage,
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#3498db',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4
            },
            {
              label: 'CT Motor',
              data: chartData.ct.voltage,
              borderColor: '#2ecc71',
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#2ecc71',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4
            },
            {
              label: 'LT Motor',
              data: chartData.lt.voltage,
              borderColor: '#f39c12',
              backgroundColor: 'rgba(243, 156, 18, 0.1)',
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#f39c12',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 15
              }
            },
            tooltip: { 
              mode: 'index', 
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 10,
              cornerRadius: 4
            }
          },
          scales: {
            y: { 
              min: 380, 
              max: 420,
              title: { 
                display: true, 
                text: 'Voltage (V)',
                font: { weight: 'bold' }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            x: { 
              title: { 
                display: true, 
                text: 'Time',
                font: { weight: 'bold' }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            }
          },
          animation: {
            duration: 1000,
            easing: 'easeOutQuart'
          }
        }
      });
      chartInstances.current.push(chart);
    }

    // Energy Efficiency Chart
    if (efficiencyChartRef.current) {
      const ctx = efficiencyChartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ['Efficiency', 'Loss'],
          datasets: [{
            data: [currentEfficiency, 100 - currentEfficiency],
            backgroundColor: ['#2ecc71', '#e74c3c'],
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: { 
              display: true,
              position: 'bottom',
              labels: {
                padding: 15,
                usePointStyle: true
              }
            },
            tooltip: { 
              callbacks: {
                label: function(context) {
                  return `${context.label}: ${context.parsed}%`;
                }
              }
            }
          },
          animation: {
            animateScale: true,
            animateRotate: true
          }
        }
      });
      chartInstances.current.push(chart);
    }

    // Daily Energy Cost Chart
    if (costChartRef.current) {
      const ctx = costChartRef.current.getContext('2d');
      
      // Calculate daily costs from energy data
      const dailyCosts = {
        hoist: chartData.hoist.cost.reduce((sum, cost) => sum + cost, 0),
        ct: chartData.ct.cost.reduce((sum, cost) => sum + cost, 0),
        lt: chartData.lt.cost.reduce((sum, cost) => sum + cost, 0)
      };

      const chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ['Hoist', 'CT', 'LT'],
          datasets: [{
            label: 'Energy Cost ($)',
            data: [dailyCosts.hoist, dailyCosts.ct, dailyCosts.lt],
            backgroundColor: ['#3498db', '#2ecc71', '#f39c12'],
            borderColor: ['#2980b9', '#27ae60', '#d35400'],
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { 
              beginAtZero: true,
              title: { 
                display: true, 
                text: 'Cost ($)',
                font: { weight: 'bold' }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            x: { 
              grid: { display: false }
            }
          },
          animation: {
            duration: 1000
          }
        }
      });
      chartInstances.current.push(chart);
    }

    // Energy Load Distribution Chart
    if (energyLoadChartRef.current) {
      const ctx = energyLoadChartRef.current.getContext('2d');
      
      // Calculate total energy consumption by motor type
      const totalEnergy = {
        hoist: chartData.hoist.energy.reduce((sum, energy) => sum + energy, 0),
        ct: chartData.ct.energy.reduce((sum, energy) => sum + energy, 0),
        lt: chartData.lt.energy.reduce((sum, energy) => sum + energy, 0)
      };

      const chart = new Chart(ctx, {
        type: "pie",
        data: {
          labels: ['Hoist Motor', 'CT Motor', 'LT Motor'],
          datasets: [{
            data: [totalEnergy.hoist, totalEnergy.ct, totalEnergy.lt],
            backgroundColor: ['#3498db', '#2ecc71', '#f39c12'],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 12
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              position: 'bottom',
              labels: {
                padding: 15,
                usePointStyle: true
              }
            },
            tooltip: { 
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((context.parsed / total) * 100);
                  return `${context.label}: ${context.parsed.toFixed(1)} kWh (${percentage}%)`;
                }
              }
            }
          },
          animation: {
            animateScale: true,
            animateRotate: true
          }
        }
      });
      chartInstances.current.push(chart);
    }

    return () => {
      chartInstances.current.forEach(chart => chart && chart.destroy());
      chartInstances.current = [];
    };
  }, [energyData]);

  return (
    <div className="energy-charts">
      <h2 className="section-title">Energy Analytics</h2>
      
      <div className="charts-grid">
        {/* Power Consumption Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Power Consumption</h3>
            <span className="chart-subtitle">Real-time Power (kW)</span>
          </div>
          <div className="chart-container">
            <canvas ref={powerChartRef}></canvas>
          </div>
        </div>

        {/* Current Draw Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Current Draw</h3>
            <span className="chart-subtitle">Motor Current (A)</span>
          </div>
          <div className="chart-container">
            <canvas ref={currentChartRef}></canvas>
          </div>
        </div>

        {/* Voltage Levels Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Voltage Levels</h3>
            <span className="chart-subtitle">Supply Voltage (V)</span>
          </div>
          <div className="chart-container">
            <canvas ref={voltageChartRef}></canvas>
          </div>
        </div>

        {/* Energy Efficiency Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Energy Efficiency</h3>
            <span className="chart-subtitle">Overall System Efficiency</span>
          </div>
          <div className="chart-container">
            <canvas ref={efficiencyChartRef}></canvas>
          </div>
        </div>

        {/* Daily Energy Cost Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Daily Energy Cost</h3>
            <span className="chart-subtitle">Cost Distribution by Motor</span>
          </div>
          <div className="chart-container">
            <canvas ref={costChartRef}></canvas>
          </div>
        </div>

        {/* Energy Load Distribution Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Energy Load Distribution</h3>
            <span className="chart-subtitle">Energy Consumption by Motor</span>
          </div>
          <div className="chart-container">
            <canvas ref={energyLoadChartRef}></canvas>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnergyCharts;