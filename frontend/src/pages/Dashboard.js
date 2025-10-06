import React, { useState, useEffect } from 'react';
import DashboardStats from '../components/DashBoard/DashboardStats';
import StatusFilter from '../components/DashBoard/StatusFilter';
import CraneGrid from '../components/DashBoard/CraneGrid';

const Dashboard = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [craneData, setCraneData] = useState({});
  const [metrics, setMetrics] = useState({
    totalPower: 0,
    totalCurrent: 0,
    activeCranes: 0,
    idleCranes: 0
  });
  const [oee, setOee] = useState({
    oee: 0,
    availability: 0,
    performance: 0,
    quality: 0
  });

  // Initialize crane data
  useEffect(() => {
    const initialCraneData = {
      'CRN-001': {
        name: 'Gantry Crane #1',
        status: 'Working',
        updated: '2 mins ago',
        load: '4,250 kg',
        capacity: '5,000 kg',
        health: '94%',
        devices: ['DEV-001', 'DEV-002']
      },
      'CRN-002': {
        name: 'Overhead Crane #2',
        status: 'Idle',
        updated: '5 mins ago',
        load: '0 kg',
        capacity: '10,000 kg',
        health: '88%',
        devices: ['DEV-003']
      },
      'CRN-003': {
        name: 'Jib Crane #3',
        status: 'Overload',
        updated: '1 min ago',
        load: '6,200 kg',
        capacity: '5,000 kg',
        health: '76%',
        devices: ['DEV-004']
      },
      'CRN-004': {
        name: 'Bridge Crane #4',
        status: 'Error',
        updated: '8 mins ago',
        load: '3,800 kg',
        capacity: '8,000 kg',
        health: '65%',
        devices: ['DEV-005']
      },
      'CRN-005': {
        name: 'Gantry Crane #5',
        status: 'Off',
        updated: '1 hour ago',
        load: '0 kg',
        capacity: '8,000 kg',
        health: '90%',
        devices: ['DEV-006']
      }
    };

    setCraneData(initialCraneData);
    updateDashboardMetrics(initialCraneData);
    updateOEE(initialCraneData);
  }, []);

  const updateDashboardMetrics = (craneData) => {
    let totalPower = 0;
    let totalCurrent = 0;
    let activeCranes = 0;
    let idleCranes = 0;

    Object.values(craneData).forEach(crane => {
      switch(crane.status.toLowerCase()) {
        case 'working':
          activeCranes++;
          break;
        case 'idle':
          idleCranes++;
          break;
      }

      if (crane.status === 'Working') {
        const load = parseFloat(crane.load.replace(/[^0-9.]/g, '')) || 0;
        const capacity = parseFloat(crane.capacity.replace(/[^0-9.]/g, '')) || 1;
        const loadRatio = Math.min(load / capacity, 1);
        totalPower += 5 + (15 * loadRatio);
        totalCurrent += 10 + (30 * loadRatio);
      } else if (crane.status === 'Idle') {
        totalPower += 2;
        totalCurrent += 5;
      }
    });

    setMetrics({
      totalPower: totalPower.toFixed(1),
      totalCurrent: totalCurrent.toFixed(1),
      activeCranes,
      idleCranes
    });
  };

  const updateOEE = (craneData) => {
    const availability = 92;
    const performance = 85;
    const quality = 98;
    const oeeValue = (availability * performance * quality) / 10000;

    setOee({
      oee: Math.round(oeeValue),
      availability,
      performance,
      quality
    });
  };

  const handleRefresh = () => {
    updateDashboardMetrics(craneData);
    updateOEE(craneData);
  };

  return (
    <>
      <div className="page-title">
        <h1>Dashboard Overview</h1>
        <p>Real-time view of all crane operations</p>
      </div>

      <DashboardStats 
        metrics={metrics}
        oee={oee}
        onRefresh={handleRefresh}
      />

      <StatusFilter 
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <CraneGrid 
        craneData={craneData}
        activeFilter={activeFilter}
      />
    </>
  );
};

export default Dashboard;