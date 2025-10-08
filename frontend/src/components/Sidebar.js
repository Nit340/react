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
    { icon: 'fas fa-wave-square', label: 'Vibration Monitoring', path: '/vibration' },
    { icon: 'fas fa-bolt', label: 'Energy Monitoring', path: '/energy' },
    { icon: 'fas fa-temperature-high', label: 'Temperature', path: '/temperature' },
    { icon: 'fas fa-ban', label: 'Brake Monitoring', path: '/brake' },
    { icon: 'fas fa-map-marked-alt', label: 'Zone Control', path: '/zone' },
    { icon: 'fas fa-cogs', label: 'Rule Engine', path: '/rule-engine' },
    { icon: 'fas fa-database', label: 'Data Hub', path: '/data-hub' },
    { icon: 'fas fa-exclamation-triangle', label: 'Error Log', path: '/errors' },
    { icon: 'fas fa-file-export', label: 'Reports', path: '/reports' },
    { icon: 'fas fa-bell', label: 'Alerts', path: '/alerts' },
    { 
      icon: 'fas fa-cog', 
      label: 'Settings', 
      isDropdown: true,
      dropdownItems: [
        { icon: 'fas fa-weight-hanging', label: 'Machine', path: '/settings/machine' },
        { icon: 'fas fa-network-wired', label: 'Iot-gateway', path: '/settings/iot-gateway' },
        { icon: 'fas fa-microchip', label: 'Device', path: '/settings/device' }
      ]
    },
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
            className={`nav-item ${item.isDropdown ? 'dropdown' : ''} ${isActive(item.path) ? 'active' : ''}`}
          >
            {item.isDropdown ? (
              <>
                <a 
                  href="#" 
                  className="nav-link dropdown-toggle"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleDropdown('settings');
                  }}
                >
                  <i className={item.icon}></i>
                  <span>{item.label}</span>
                  <i className="dropdown-icon fas fa-chevron-down"></i>
                </a>
                <div className={`dropdown-menu ${activeDropdown === 'settings' ? 'show' : ''}`}>
                  {item.dropdownItems.map((dropdownItem, idx) => (
                    <Link 
                      key={idx} 
                      to={dropdownItem.path} 
                      className={`dropdown-item ${isActive(dropdownItem.path) ? 'active' : ''}`}
                      onClick={() => {
                        setActiveDropdown(null);
                        setSidebarExpanded(false);
                      }}
                    >
                      <i className={dropdownItem.icon}></i>
                      <span>{dropdownItem.label}</span>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <Link 
                to={item.path} 
                className="nav-link"
                onClick={() => setSidebarExpanded(false)}
              >
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;