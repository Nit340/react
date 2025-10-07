// components/EnergyMonitoring/EnergyCharts.js
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const EnergyCharts = () => {
  const powerChartRef = useRef(null);
  const currentChartRef = useRef(null);
  const voltageChartRef = useRef(null);
  const efficiencyChartRef = useRef(null);
  const costChartRef = useRef(null);
  const energyLoadChartRef = useRef(null);

  const chartInstances = useRef([]);

  useEffect(() => {
    // Sample data for charts
    const timeLabels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    
    const energyData = {
      hoist: {
        power: [8.2, 7.8, 7.5, 8.0, 12.5, 14.2, 15.0, 14.8, 13.5, 10.2, 8.5, 7.8],
        current: [18.5, 17.6, 16.9, 18.0, 28.2, 32.0, 33.8, 33.3, 30.4, 23.0, 19.2, 17.6],
        voltage: [415, 418, 415, 412, 410, 408, 405, 403, 400, 398, 415, 418],
        energy: [16.4, 15.6, 15.0, 16.0, 25.0, 28.4, 30.0, 29.6, 27.0, 20.4, 17.0, 15.6],
        cost: [2.46, 2.34, 2.25, 2.40, 3.75, 4.26, 4.50, 4.44, 4.05, 3.06, 2.55, 2.34]
      },
      travel: {
        power: [5.5, 5.2, 5.0, 5.3, 8.2, 9.5, 10.2, 9.8, 9.0, 6.8, 5.7, 5.3],
        current: [12.4, 11.7, 11.3, 11.9, 18.5, 21.4, 23.0, 22.1, 20.3, 15.3, 12.8, 11.9],
        voltage: [408, 410, 405, 402, 400, 398, 395, 392, 390, 388, 408, 410],
        energy: [11.0, 10.4, 10.0, 10.6, 16.4, 19.0, 20.4, 19.6, 18.0, 13.6, 11.4, 10.6],
        cost: [1.65, 1.56, 1.50, 1.59, 2.46, 2.85, 3.06, 2.94, 2.70, 2.04, 1.71, 1.59]
      },
      trolley: {
        power: [4.8, 4.5, 4.3, 4.6, 7.0, 8.2, 8.8, 8.5, 7.8, 5.9, 5.0, 4.6],
        current: [10.8, 10.1, 9.7, 10.4, 15.8, 18.5, 19.8, 19.1, 17.6, 13.3, 11.3, 10.4],
        voltage: [419, 417, 415, 412, 410, 408, 405, 403, 400, 398, 419, 417],
        energy: [9.6, 9.0, 8.6, 9.2, 14.0, 16.4, 17.6, 17.0, 15.6, 11.8, 10.0, 9.2],
        cost: [1.44, 1.35, 1.29, 1.38, 2.10, 2.46, 2.64, 2.55, 2.34, 1.77, 1.50, 1.38]
      }
    };

    // Destroy existing charts
    chartInstances.current.forEach(chart => chart && chart.destroy());
    chartInstances.current = [];

    // Power Consumption Chart
    if (powerChartRef.current) {
      const ctx = powerChartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'Hoist Motor',
              data: energyData.hoist.power,
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Travel Motor',
              data: energyData.travel.power,
              borderColor: '#2ecc71',
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Trolley Motor',
              data: energyData.trolley.power,
              borderColor: '#f39c12',
              backgroundColor: 'rgba(243, 156, 18, 0.1)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            y: { title: { display: true, text: 'Power (kW)' } },
            x: { title: { display: true, text: 'Time of Day' } }
          }
        }
      });
      chartInstances.current.push(chart);
    }

    // Current Draw Chart
    if (currentChartRef.current) {
      const ctx = currentChartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'Hoist Motor',
              data: energyData.hoist.current,
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Travel Motor',
              data: energyData.travel.current,
              borderColor: '#2ecc71',
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Trolley Motor',
              data: energyData.trolley.current,
              borderColor: '#f39c12',
              backgroundColor: 'rgba(243, 156, 18, 0.1)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            y: { title: { display: true, text: 'Current (A)' } },
            x: { title: { display: true, text: 'Time of Day' } }
          }
        }
      });
      chartInstances.current.push(chart);
    }

    // Voltage Levels Chart
    if (voltageChartRef.current) {
      const ctx = voltageChartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'Hoist Motor',
              data: energyData.hoist.voltage,
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Travel Motor',
              data: energyData.travel.voltage,
              borderColor: '#2ecc71',
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Trolley Motor',
              data: energyData.trolley.voltage,
              borderColor: '#f39c12',
              backgroundColor: 'rgba(243, 156, 18, 0.1)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            y: { 
              min: 350, 
              max: 460,
              title: { display: true, text: 'Voltage (V)' } 
            },
            x: { title: { display: true, text: 'Time of Day' } }
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
            data: [87, 13],
            backgroundColor: ['#2ecc71', '#e74c3c'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '80%',
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          }
        }
      });
      chartInstances.current.push(chart);
    }

    // Daily Energy Cost Chart
    if (costChartRef.current) {
      const ctx = costChartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Hoist Motor',
              data: [18.45, 19.20, 17.85, 20.10, 22.35, 15.60, 12.30],
              backgroundColor: '#3498db'
            },
            {
              label: 'Travel Motor',
              data: [12.30, 12.80, 11.90, 13.40, 14.90, 10.40, 8.20],
              backgroundColor: '#2ecc71'
            },
            {
              label: 'Trolley Motor',
              data: [10.80, 11.20, 10.40, 11.75, 13.05, 9.10, 7.20],
              backgroundColor: '#f39c12'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            y: { 
              beginAtZero: true,
              title: { display: true, text: 'Cost ($)' } 
            },
            x: { 
              stacked: false,
              title: { display: true, text: 'Day of Week' } 
            }
          }
        }
      });
      chartInstances.current.push(chart);
    }

    // Energy vs Load Weight Chart
    if (energyLoadChartRef.current) {
      const ctx = energyLoadChartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: ['0', '5', '10', '15', '20', '25', '30', '35', '40'],
          datasets: [
            {
              label: 'Energy Consumption (kWh)',
              data: [0, 5.2, 10.5, 15.8, 21.2, 26.5, 31.8, 37.2, 42.5],
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y} kWh at ${context.parsed.x} tons`;
                }
              }
            }
          },
          scales: {
            y: { title: { display: true, text: 'Energy Consumption (kWh)' } },
            x: { title: { display: true, text: 'Load Weight (tons)' } }
          }
        }
      });
      chartInstances.current.push(chart);
    }

    return () => {
      chartInstances.current.forEach(chart => chart && chart.destroy());
    };
  }, []);

  return (
    <div className="chart-grid">
      {/* Power Consumption Chart */}
      <div className="chart-container">
        <div className="chart-title">Power Consumption</div>
        <div className="chart-wrapper">
          <canvas ref={powerChartRef}></canvas>
        </div>
      </div>
      
      {/* Current Draw Chart */}
      <div className="chart-container">
        <div className="chart-title">Current Draw</div>
        <div className="chart-wrapper">
          <canvas ref={currentChartRef}></canvas>
        </div>
      </div>
      
      {/* Voltage Levels Chart */}
      <div className="chart-container">
        <div className="chart-title">Voltage Levels</div>
        <div className="chart-wrapper">
          <canvas ref={voltageChartRef}></canvas>
        </div>
      </div>
      
      {/* Energy Efficiency Chart */}
      <div className="chart-container">
        <div className="chart-title">Energy Efficiency</div>
        <div className="chart-wrapper">
          <canvas ref={efficiencyChartRef}></canvas>
        </div>
      </div>
      
      {/* Daily Energy Cost Chart */}
      <div className="chart-container">
        <div className="chart-title">Daily Energy Cost</div>
        <div className="chart-wrapper">
          <canvas ref={costChartRef}></canvas>
        </div>
      </div>
      
      {/* Energy vs Load Weight Chart */}
      <div className="chart-container">
        <div className="chart-title">Energy vs Load Weight</div>
        <div className="chart-wrapper">
          <canvas ref={energyLoadChartRef}></canvas>
        </div>
      </div>
    </div>
  );
};

export default EnergyCharts;