import React from 'react';

const TemplatePage = ({ title, description, children }) => {
  return (
    <>
      <div className="page-title">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      
      <div className="page-content">
        {children}
      </div>
    </>
  );
};

export default TemplatePage;