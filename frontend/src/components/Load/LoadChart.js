// components/Load/LoadChart.js
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const LoadChart = ({ loadData }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && loadData.length > 0) {
      // Destroy existing chart
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Get last 10 data points for the chart (most recent first)
      const chartDataPoints = loadData.slice(0, 10).reverse();
      
      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartDataPoints.map(item => {
            // Extract time from timestamp (HH:MM:SS format)
            const timePart = item.timestamp.split(' ')[1];
            return timePart || item.timestamp;
          }),
          datasets: [
            {
              label: 'Load Percentage',
              data: chartDataPoints.map(item => item.percentage),
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              borderWidth: 3,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.1,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 120,
              title: {
                display: true,
                text: 'Load Percentage (%)',
                font: {
                  weight: 'bold',
                  size: 13
                }
              },
              ticks: {
                callback: function(value) {
                  return value + '%';
                },
                stepSize: 20
              },
              grid: {
                color: 'rgba(0,0,0,0.05)',
                drawBorder: false
              }
            },
            x: {
              title: {
                display: true,
                text: 'Time',
                font: {
                  weight: 'bold',
                  size: 13
                }
              },
              grid: {
                display: false
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 20,
                font: {
                  size: 12
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  label += context.raw + '%';
                  return label;
                }
              }
            }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [loadData]);

  return (
    <div className="chart-container">
      <h3>Load Percentage Over Time</h3>
      <div className="chart-wrapper">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

export default LoadChart;