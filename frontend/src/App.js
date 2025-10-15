import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Pages
import Dashboard from './pages/Dashboard';
import OperationsLog from './pages/OperationsLog';
import Load from './pages/Load';
import EnergyMonitoring from './pages/EnergyMonitoring';
import RuleEngine from './pages/RuleEngine';
import Help from './pages/Help';
import South from './pages/South/South';
import SouthConfig from './pages/South/SouthConfig';
import Demo from './pages/Demo';
import CraneDetails from './pages/CraneDetails';  
import NotificationHandler from './components/NotificationHandler';
// Styles
import './App.css';
import './CSS/Dashboard.css';
import './CSS/South.css';
import './CSS/SouthConfig.css';
import './CSS/OperationsLog.css';
import './CSS/Filter.css';
import './CSS/EnergyMonitoring.css';
// In App.js, add this import with the others
import './CSS/Demo.css';
// In App.js, add this import with the others
import './CSS/Load.css';
import './CSS/RuleEngine.css';

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
          <NotificationHandler />

          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/south" element={<South />} />
            <Route path="/real" element={<Demo />} />
            <Route path="/operations" element={<OperationsLog />} />
            <Route path="/load" element={<Load />} />
            <Route path="/energy" element={<EnergyMonitoring />} />
            <Route path="/rule-engine" element={<RuleEngine />} />
            <Route path="/help" element={<Help />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/south/config/:serviceName" element={<SouthConfig />} /> 
            <Route path="/crane-details" element={<CraneDetails />} />

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