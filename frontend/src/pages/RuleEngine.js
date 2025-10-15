import React, { useState, useEffect, useCallback } from 'react';

const RuleEngine = () => {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [machineFilter, setMachineFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    machine: '',
    scheduleType: 'daily',
    time: '',
    day: 'monday',
    specificDate: '',
    action: '',
    description: '',
    executionTrigger: 'on-connect'
  });
  const [conditions, setConditions] = useState([]);

  // Sample rules data
  const sampleRules = [
    {
      id: 1,
      name: "Extended Operation Alert",
      machine: "All Cranes",
      type: "scheduled",
      condition: "Operation time > 2 hours",
      action: "Send Alert",
      status: "active",
      trigger: "on-data",
      description: "Triggers when a crane operates continuously for more than 2 hours without a break",
      activeSince: "2023-05-10"
    },
    {
      id: 2,
      name: "Weekend Operation Alert",
      machine: "All Cranes",
      type: "scheduled",
      condition: "Operation on weekend",
      action: "Send Notification",
      status: "active",
      trigger: "on-connect",
      description: "Notifies when any crane operates on weekends",
      activeSince: "2023-04-15"
    },
    {
      id: 3,
      name: "High Ambient Temperature Alert",
      machine: "CRN-001, CRN-002",
      type: "scheduled",
      condition: "Temperature > 35°C",
      action: "Send Alert",
      status: "active",
      trigger: "on-data",
      description: "Triggers when ambient temperature exceeds 35°C and crane is operating",
      activeSince: "2023-06-01"
    },
    {
      id: 4,
      name: "Maintenance Due Alert",
      machine: "CRN-003, CRN-004",
      type: "scheduled",
      condition: "Maintenance due in 7 days",
      action: "Schedule Maintenance",
      status: "active",
      trigger: "scheduled",
      description: "Triggers when maintenance is due within 7 days based on operation hours",
      activeSince: "2023-05-22"
    },
    {
      id: 5,
      name: "Weekly Maintenance Check",
      machine: "All Cranes",
      type: "scheduled",
      condition: "Every Monday at 08:00 AM (if Status = Idle)",
      action: "Run Diagnostics",
      status: "active",
      trigger: "on-disconnect",
      description: "Runs diagnostic checks every Monday morning if cranes are idle",
      activeSince: "2023-06-15"
    }
  ];

  // Fetch rules from API
  useEffect(() => {
    console.log('🔄 RuleEngine mounted, fetching rules...');
    fetchRules();
  }, []);

  const fetchRules = useCallback(async () => {
    console.log('🔄 Starting fetchRules...');
    try {
      setIsLoading(true);
      
      // TODO: Replace with actual API endpoint
      const apiUrl = '/api/rules';
      console.log('🌐 Making API request to:', apiUrl);
      
      // For now, use sample data
      setTimeout(() => {
        console.log('✅ Rules data loaded successfully');
        setRules(sampleRules);
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('💥 Error fetching rules:', error);
      // Fallback to sample data
      setRules(sampleRules);
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addCondition = () => {
    setConditions(prev => [
      ...prev,
      {
        id: Date.now(),
        datapoint: '',
        operator: '>',
        value: '',
        unit: ''
      }
    ]);
  };

  const removeCondition = (id) => {
    setConditions(prev => prev.filter(condition => condition.id !== id));
  };

  const updateCondition = (id, field, value) => {
    setConditions(prev => 
      prev.map(condition => 
        condition.id === id ? { ...condition, [field]: value } : condition
      )
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create new rule
    const newRule = {
      id: rules.length + 1,
      name: formData.name,
      machine: formData.machine,
      type: "scheduled",
      condition: formatConditionText(),
      action: formData.action,
      status: "active",
      trigger: formData.executionTrigger,
      description: formData.description,
      activeSince: new Date().toISOString().split('T')[0]
    };

    // Add to rules
    setRules(prev => [newRule, ...prev]);
    
    // Reset form
    setFormData({
      name: '',
      machine: '',
      scheduleType: 'daily',
      time: '',
      day: 'monday',
      specificDate: '',
      action: '',
      description: '',
      executionTrigger: 'on-connect'
    });
    setConditions([]);
    setShowCreateForm(false);
    
    console.log('✅ New rule created:', newRule);
    
    // TODO: Send to API
    // await saveRuleToAPI(newRule);
  };

  const formatConditionText = () => {
    let conditionText = "";
    
    // Schedule condition
    if (formData.scheduleType === 'daily') {
      conditionText = `Daily at ${formData.time}`;
    } else if (formData.scheduleType === 'weekly') {
      conditionText = `Every ${formData.day.charAt(0).toUpperCase() + formData.day.slice(1)} at ${formData.time}`;
    } else if (formData.scheduleType === 'monthly') {
      conditionText = `Monthly at ${formData.time}`;
    } else {
      conditionText = `On ${formData.specificDate} at ${formData.time}`;
    }
    
    // Additional conditions
    if (conditions.length > 0) {
      conditionText += " (if ";
      conditions.forEach((cond, index) => {
        if (index > 0) conditionText += " AND ";
        conditionText += `${cond.datapoint} ${cond.operator} ${cond.value}${cond.unit}`;
      });
      conditionText += ")";
    }
    
    return conditionText;
  };

  const deleteRule = (ruleId) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      setRules(prev => prev.filter(rule => rule.id !== ruleId));
      console.log('🗑️ Rule deleted:', ruleId);
    }
  };

  const filteredRules = machineFilter === 'all' 
    ? rules 
    : rules.filter(rule => rule.machine.toLowerCase().includes(machineFilter));

  const getTriggerIcon = (trigger) => {
    switch (trigger) {
      case 'on-connect': return 'fa-plug';
      case 'on-data': return 'fa-database';
      case 'on-disconnect': return 'fa-plug-circle-xmark';
      default: return 'fa-clock';
    }
  };

  const getTriggerText = (trigger) => {
    switch (trigger) {
      case 'on-connect': return 'On Connect';
      case 'on-data': return 'On Data';
      case 'on-disconnect': return 'On Disconnect';
      default: return 'Scheduled';
    }
  };

  return (
    <>
      <div className="page-title">
        <h1>Machine Rule Engine</h1>
        <p>Create and manage automation rules for your machines</p>
      </div>

      {/* Create New Rule Card */}
      <div className="card">
        <div className="card-header">
          <span>Create New Rule</span>
          <button 
            className={`btn-secondary btn-small ${showCreateForm ? 'active' : ''}`}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <i className={`fas ${showCreateForm ? 'fa-minus' : 'fa-plus'}`}></i>
            {showCreateForm ? 'Cancel' : 'New Rule'}
          </button>
        </div>
        
        {showCreateForm && (
          <div className="card-body">
            <form className="rule-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="rule-name">Rule Name</label>
                <input 
                  type="text" 
                  id="rule-name" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter rule name" 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="machine">Machine</label>
                <select 
                  id="machine" 
                  name="machine"
                  value={formData.machine}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select machine</option>
                  <option value="crane-001">Crane #001</option>
                  <option value="crane-002">Crane #002</option>
                  <option value="cnc-101">CNC Machine #101</option>
                  <option value="press-201">Hydraulic Press #201</option>
                  <option value="conveyor-301">Conveyor Belt #301</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="schedule-type">Schedule Type</label>
                <select 
                  id="schedule-type" 
                  name="scheduleType"
                  value={formData.scheduleType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="specific">Specific Date</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="time">Time</label>
                <input 
                  type="time" 
                  id="time" 
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  required 
                />
              </div>

              {formData.scheduleType === 'weekly' && (
                <div className="form-group">
                  <label htmlFor="day">Day of Week</label>
                  <select 
                    id="day" 
                    name="day"
                    value={formData.day}
                    onChange={handleInputChange}
                  >
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                    <option value="sunday">Sunday</option>
                  </select>
                </div>
              )}

              {formData.scheduleType === 'specific' && (
                <div className="form-group">
                  <label htmlFor="specific-date">Specific Date</label>
                  <input 
                    type="date" 
                    id="specific-date" 
                    name="specificDate"
                    value={formData.specificDate}
                    onChange={handleInputChange}
                  />
                </div>
              )}

              {/* Execution Trigger Section */}
              <div className="execution-trigger">
                <div className="condition-title">Execution Trigger</div>
                <p style={{fontSize: '13px', marginBottom: '10px', color: '#64748b'}}>
                  Choose when this rule should be executed
                </p>
                <div className="trigger-options">
                  {['on-connect', 'on-data', 'on-disconnect', 'scheduled'].map(trigger => (
                    <label 
                      key={trigger}
                      className={`trigger-option ${formData.executionTrigger === trigger ? 'selected' : ''}`}
                    >
                      <input 
                        type="radio" 
                        name="executionTrigger" 
                        value={trigger}
                        checked={formData.executionTrigger === trigger}
                        onChange={handleInputChange}
                      />
                      <span>
                        {trigger === 'on-connect' && 'When machine connects'}
                        {trigger === 'on-data' && 'When data is received'}
                        {trigger === 'on-disconnect' && 'When machine disconnects'}
                        {trigger === 'scheduled' && 'At scheduled time only'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Condition Section */}
              <div className="condition-section">
                <div className="condition-header">
                  <div className="condition-title">Additional Conditions (Optional)</div>
                  <button type="button" className="add-condition-btn" onClick={addCondition}>
                    <i className="fas fa-plus"></i> Add Condition
                  </button>
                </div>
                {conditions.map(condition => (
                  <div key={condition.id} className="condition-section">
                    <div className="condition-header">
                      <div className="condition-title">Condition</div>
                      <button 
                        type="button" 
                        className="remove-condition-btn" 
                        onClick={() => removeCondition(condition.id)}
                      >
                        <i className="fas fa-times"></i> Remove
                      </button>
                    </div>
                    <div className="form-group">
                      <label>Data Point</label>
                      <select 
                        value={condition.datapoint}
                        onChange={(e) => updateCondition(condition.id, 'datapoint', e.target.value)}
                        required
                      >
                        <option value="">Select data point</option>
                        <option value="temperature">Temperature</option>
                        <option value="pressure">Pressure</option>
                        <option value="speed">Speed</option>
                        <option value="load">Load</option>
                        <option value="voltage">Voltage</option>
                        <option value="status">Status</option>
                      </select>
                    </div>
                    <div className="condition-group">
                      <div className="form-group">
                        <label>Operator</label>
                        <select 
                          value={condition.operator}
                          onChange={(e) => updateCondition(condition.id, 'operator', e.target.value)}
                          required
                        >
                          <option value=">">Greater Than</option>
                          <option value="<">Less Than</option>
                          <option value="==">Equals</option>
                          <option value=">=">Greater or Equal</option>
                          <option value="<=">Less or Equal</option>
                          <option value="!=">Not Equals</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Value</label>
                        <input 
                          type="text" 
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                          placeholder="Value" 
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label>Unit</label>
                        <select 
                          value={condition.unit}
                          onChange={(e) => updateCondition(condition.id, 'unit', e.target.value)}
                        >
                          <option value="">N/A</option>
                          <option value="°C">°C</option>
                          <option value="psi">psi</option>
                          <option value="rpm">rpm</option>
                          <option value="kg">kg</option>
                          <option value="V">V</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label htmlFor="action">Action</label>
                <select 
                  id="action" 
                  name="action"
                  value={formData.action}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select action</option>
                  <option value="start">Start Machine</option>
                  <option value="stop">Stop Machine</option>
                  <option value="alert">Send Alert</option>
                  <option value="adjust">Adjust Parameters</option>
                  <option value="maintenance">Schedule Maintenance</option>
                  <option value="backup">Create Backup</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea 
                  id="description" 
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="2" 
                  placeholder="Rule description"
                />
              </div>

              <div className="actions">
                <button type="submit" className="btn-primary">Create Rule</button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Active Rules Card */}
      <div className="card">
        <div className="card-header">
          <span>Active Rules</span>
          {isLoading && <span className="loading-text">Loading rules...</span>}
        </div>
        <div className="card-body">
          <div className="filter-container">
            <label htmlFor="machine-type">Filter by Machine Type:</label>
            <select 
              id="machine-type" 
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
            >
              <option value="all">All Machines</option>
              <option value="crane">Crane</option>
              <option value="cnc">CNC Machine</option>
              <option value="press">Hydraulic Press</option>
              <option value="conveyor">Conveyor Belt</option>
            </select>
          </div>
          
          <div className="rules-grid">
            {filteredRules.length === 0 ? (
              <div className="no-rules">
                <i className="fas fa-rules" style={{fontSize: '3rem', color: '#94a3b8', marginBottom: '1rem'}}></i>
                <p>No rules found. Create your first rule to get started.</p>
              </div>
            ) : (
              filteredRules.map(rule => (
                <div key={rule.id} className="rule-card">
                  <div className="rule-card-header">
                    <div>
                      <div className="rule-card-title">{rule.name}</div>
                      <div className="rule-card-details">{rule.description}</div>
                    </div>
                    <span className={`status-badge status-${rule.status}`}>
                      {rule.status}
                    </span>
                  </div>
                  <div className="rule-card-details">
                    <strong>Machines:</strong> {rule.machine}
                  </div>
                  <div className="rule-card-details">
                    <strong>Condition:</strong> {rule.condition}
                  </div>
                  <div className="rule-card-details">
                    <strong>Trigger:</strong> 
                    <i className={`fas ${getTriggerIcon(rule.trigger)}`} style={{margin: '0 5px'}}></i> 
                    {getTriggerText(rule.trigger)}
                  </div>
                  <div className="rule-card-meta">
                    <span>Active since {rule.activeSince}</span>
                  </div>
                  <div className="rule-card-actions">
                    <button className="btn-primary btn-small">
                      <i className="fas fa-edit"></i> Edit
                    </button>
                    <button 
                      className="btn-danger btn-small"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .loading-text {
          color: #64748b;
          font-size: 14px;
        }
        .no-rules {
          text-align: center;
          padding: 2rem;
          color: #64748b;
        }
      `}</style>
    </>
  );
};

export default RuleEngine;