import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ sidebarExpanded, setSidebarExpanded }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();

  const toggleDropdown = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  const navItems = [
    { icon: 'fas fa-tachometer-alt', label: 'Dashboard', path: '/' },
    { icon: 'fas fa-compass', label: 'South', path: '/south' },
    { icon:'fas fa-penguin', label: 'Demo', path: '/demo' },
    { icon: 'fas fa-history', label: 'Operations Log', path: '/operations' },
    { icon: 'fas fa-weight-hanging', label: 'Load', path: '/load' },
    { icon: 'fas fa-bolt', label: 'Energy Monitoring', path: '/energy' },
    { icon: 'fas fa-cogs', label: 'Rule Engine', path: '/rule-engine' },
    { icon: 'fas fa-question-circle', label: 'Help', path: '/help' }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div 
      className={`sidebar ${sidebarExpanded ? 'expanded' : ''}`}
      onMouseEnter={() => !sidebarExpanded && setSidebarExpanded(true)}
      onMouseLeave={() => !sidebarExpanded && setSidebarExpanded(false)}
    >
      <button 
        className="sidebar-toggle" 
        onClick={() => setSidebarExpanded(!sidebarExpanded)}
      >
        <i className="fas fa-bars"></i>
      </button>
      
      <div className="nav-menu">
        {navItems.map((item, index) => (
          <div 
            key={index} 
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
          >
            <Link 
              to={item.path} 
              className="nav-link"
              onClick={() => setSidebarExpanded(false)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;