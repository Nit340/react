import React, { useState, useRef, useEffect } from 'react';

const Header = () => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    window.location.href = '/login'; // You might want to create a login page
  };

  return (
    <div className="header">
      <div className="header-left">
        <div className="header-logo">CraneIQ</div>
      </div>
      
      <div className="user-info-wrapper">
        <div className="account-dropdown" ref={dropdownRef}>
          <div 
            className="account-trigger" 
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          >
            <img src="image/houzz.png" className="customer-logo" alt="Customer Logo" />
            <span>Hilton (Pro Plan)</span>
            <i className="fas fa-caret-down"></i>
          </div>
          <div className={`account-menu ${userDropdownOpen ? 'show' : ''}`}>
            <div className="account-menu-item plan-info">
              <i className="fas fa-crown" style={{ color: 'gold' }}></i>
              <span>Pro Plan</span>
            </div>
            <div className="account-menu-divider"></div>
            <a href="#" className="account-menu-item">
              <i className="fas fa-user"></i> Profile
            </a>
            <a href="#" className="account-menu-item">
              <i className="fas fa-sync-alt"></i> Upgrade Plan
            </a>
            <div className="account-menu-divider"></div>
            <button onClick={handleLogout} className="account-menu-item logout-account-btn">
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;