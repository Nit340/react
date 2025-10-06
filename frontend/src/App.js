import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Pages
import Dashboard from './pages/Dashboard';
import OperationsLog from './pages/OperationsLog';
import Load from './pages/Load';
import VibrationMonitoring from './pages/VibrationMonitoring';
import EnergyMonitoring from './pages/EnergyMonitoring';
import Temperature from './pages/Temperature';
import BrakeMonitoring from './pages/BrakeMonitoring';
import ZoneControl from './pages/ZoneControl';
import RuleEngine from './pages/RuleEngine';
import DataHub from './pages/DataHub';
import ErrorLog from './pages/ErrorLog';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import Machine from './pages/settings/Machine';
import IotGateway from './pages/settings/IotGateway';
import Device from './pages/settings/Device';
import Help from './pages/Help';
import South from './pages/South/South';
import SouthConfig from './pages/South/SouthConfig';
// Styles
import './App.css';
import './CSS/Dashboard.css';
import './CSS/South.css';
import './CSS/SouthConfig.css';
function App() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <Router>
      <div className={`container ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
        <Sidebar 
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
        />
        <div className="main-content">
          <Header />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/south" element={<South />} />
            <Route path="/operations" element={<OperationsLog />} />
            <Route path="/load" element={<Load />} />
            <Route path="/vibration" element={<VibrationMonitoring />} />
            <Route path="/energy" element={<EnergyMonitoring />} />
            <Route path="/temperature" element={<Temperature />} />
            <Route path="/brake" element={<BrakeMonitoring />} />
            <Route path="/zone" element={<ZoneControl />} />
            <Route path="/rule-engine" element={<RuleEngine />} />
            <Route path="/data-hub" element={<DataHub />} />
            <Route path="/errors" element={<ErrorLog />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings/machine" element={<Machine />} />
            <Route path="/settings/iot-gateway" element={<IotGateway />} />
            <Route path="/settings/device" element={<Device />} />
            <Route path="/help" element={<Help />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/south/config" element={<SouthConfig />} /> {/* Add this route */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

// Simple 404 component
function NotFound() {
  return (
    <div className="page-title">
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
    </div>
  );
}

export default App;