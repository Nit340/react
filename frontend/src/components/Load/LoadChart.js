// components/Load/LoadChart.js
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const LoadChart = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      // Destroy existing chart
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM'],
          datasets: [
            {
              label: 'CRN-001 (5T)',
              data: [45, 65, 72, 68, 55],
              borderColor: '#3498db',
              backgroundColor: 'transparent',
              borderWidth: 3,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.1
            },
            {
              label: 'CRN-002 (10T)',
              data: [38, 48, 52, 85, 92],
              borderColor: '#2ecc71',
              backgroundColor: 'transparent',
              borderWidth: 3,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.1
            },
            {
              label: 'CRN-003 (5T)',
              data: [65, 72, 90, 104, 85],
              borderColor: '#e74c3c',
              backgroundColor: 'transparent',
              borderWidth: 3,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.1
            },
            {
              label: 'CRN-004 (6T)',
              data: [55, 92, 85, 95, 80],
              borderColor: '#f39c12',
              backgroundColor: 'transparent',
              borderWidth: 3,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.1
            },
            {
              label: 'CRN-005 (8T)',
              data: [40, 85, 75, 94, 70],
              borderColor: '#9b59b6',
              backgroundColor: 'transparent',
              borderWidth: 3,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.1
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
                text: 'Time of Day',
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
  }, []);

  return (
    <div className="chart-container">
      <h3>Five Crane Load Comparison</h3>
      <div className="chart-wrapper">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

export default LoadChart;