import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

// Constants
const MAX_CALLS_PER_DAY = 200;

// Agent configurations with system prompts
// Note: Config values are examples - actual values should be set via environment variables in production
const AGENTS = {
  emailRewriter: {
    id: 'emailRewriter',
    name: 'Email Rewriter Agent',
    description: 'Rewrites email body in professional tone and suggests subject line',
    placeholder: 'Enter your email text to rewrite...',
    systemPrompt: `You are a professional email rewriter agent. Your task is to:
1. Take the user's informal or draft email text
2. Rewrite it in a professional, clear, and polite tone
3. Suggest an appropriate subject line
4. Maintain the original intent and key information

Format your response as:
## Suggested Subject
[Your suggested subject line]

## Rewritten Email
[The professionally rewritten email body]

## Key Changes Made
- [List the main improvements you made]`,
    config: {
      orchestrationID: process.env.REACT_APP_WXO_ORCHESTRATION_ID || "",
      hostURL: process.env.REACT_APP_WXO_HOST_URL || "https://eu-gb.watson-orchestrate.cloud.ibm.com",
      deploymentPlatform: "ibmcloud",
      crn: process.env.REACT_APP_WXO_CRN || "",
      agentId: process.env.REACT_APP_EMAIL_AGENT_ID || "",
      agentEnvironmentId: process.env.REACT_APP_EMAIL_AGENT_ENV_ID || ""
    }
  },
  bauEstimate: {
    id: 'bauEstimate',
    name: 'BAU Enhancement Estimate Agent',
    description: 'Provides BAU enhancement estimates for development tasks',
    placeholder: 'Describe the enhancement task to estimate...',
    systemPrompt: `You are a BAU (Business As Usual) Enhancement Estimation Agent for software development projects. Your task is to:
1. Analyze the enhancement request provided by the user
2. Break down the work into phases (Analysis, Development, Testing, Documentation)
3. Provide effort estimates in hours for each phase
4. Assess complexity (Low/Medium/High)
5. List assumptions and risks

Format your response as:
## Task Analysis
[Brief analysis of the enhancement request]

## Estimation Breakdown
| Phase | Effort (Hours) | Notes |
|-------|----------------|-------|
| Analysis | X-Y | [notes] |
| Development | X-Y | [notes] |
| Testing | X-Y | [notes] |
| Documentation | X-Y | [notes] |
| **Total** | **X-Y** | |

## Complexity Assessment
**Level:** [Low/Medium/High]
**Justification:** [Why this complexity level]

## Assumptions
- [List key assumptions]

## Risks
- [List potential risks]`,
    config: {
      orchestrationID: process.env.REACT_APP_WXO_ORCHESTRATION_ID || "",
      hostURL: process.env.REACT_APP_WXO_HOST_URL || "https://eu-gb.watson-orchestrate.cloud.ibm.com",
      deploymentPlatform: "ibmcloud",
      crn: process.env.REACT_APP_WXO_CRN || "",
      agentId: process.env.REACT_APP_BAU_AGENT_ID || "",
      agentEnvironmentId: process.env.REACT_APP_BAU_AGENT_ENV_ID || ""
    }
  }
};

// WatsonX API helper - calls backend proxy to avoid CORS
const callWatsonX = async (apiKey, systemPrompt, userMessage, conversationHistory = []) => {
  // Build messages array
  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];
  
  const response = await fetch('/api/watsonx/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey,
      systemPrompt,
      messages
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'WatsonX API call failed');
  }
  
  const data = await response.json();
  return data.content;
};

// Validate API key via backend
const validateApiKey = async (apiKey) => {
  try {
    const response = await fetch('/api/watsonx/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey })
    });
    
    const data = await response.json();
    return data.valid;
  } catch {
    return false;
  }
};

// Get today's date key for storage
const getTodayKey = () => new Date().toISOString().split('T')[0];

// Usage tracking functions
const getUsage = () => {
  const stored = localStorage.getItem('agentUsage');
  if (stored) {
    const data = JSON.parse(stored);
    if (data.date === getTodayKey()) {
      return data;
    }
  }
  // Reset for new day
  return {
    date: getTodayKey(),
    emailRewriter: 0,
    bauEstimate: 0
  };
};

const saveUsage = (usage) => {
  localStorage.setItem('agentUsage', JSON.stringify(usage));
};

const incrementUsage = (agentId) => {
  const usage = getUsage();
  usage[agentId] = (usage[agentId] || 0) + 1;
  saveUsage(usage);
  return usage;
};

// Login Component
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        sessionStorage.setItem('isLoggedIn', 'true');
        onLogin();
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🤖 IBMDevDay2026 Demo</h1>
          <p>AI Agents Showcase</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              disabled={isLoading}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Agent Card Component
function AgentCard({ agent, usage, onSelect, isActive }) {
  const remaining = MAX_CALLS_PER_DAY - (usage[agent.id] || 0);
  const isDisabled = remaining <= 0;

  return (
    <div className={`agent-card ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}>
      <h3>{agent.name}</h3>
      <p>{agent.description}</p>
      <div className="usage-info">
        <div className="usage-bar">
          <div 
            className="usage-fill" 
            style={{ width: `${((usage[agent.id] || 0) / MAX_CALLS_PER_DAY) * 100}%` }}
          />
        </div>
        <span className="usage-text">
          {usage[agent.id] || 0} / {MAX_CALLS_PER_DAY} calls today
        </span>
        <span className={`remaining ${remaining <= 20 ? 'low' : ''}`}>
          {remaining} remaining
        </span>
      </div>
      <button 
        className="select-btn"
        onClick={() => onSelect(agent)}
        disabled={isDisabled}
      >
        {isDisabled ? 'Limit Reached' : isActive ? 'Active' : 'Select Agent'}
      </button>
    </div>
  );
}

// Agent Chat Component - With WatsonX Integration
function AgentChat({ agent, onIncrement, apiKey }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const conversationHistory = useRef([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset messages when agent changes
  useEffect(() => {
    conversationHistory.current = [];
    setMessages([{
      role: 'assistant',
      content: `Hello! I'm the ${agent.name}. ${agent.description}. How can I help you today?`
    }]);
    setError('');
  }, [agent.id, agent.name, agent.description]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Increment usage on each message sent
    onIncrement(agent.id);

    try {
      if (apiKey) {
        // Call WatsonX API
        const response = await callWatsonX(
          apiKey, 
          agent.systemPrompt, 
          userMessage, 
          conversationHistory.current
        );
        
        // Update conversation history for context
        conversationHistory.current.push(
          { role: 'user', content: userMessage },
          { role: 'assistant', content: response }
        );
        
        // Keep only last 10 messages for context
        if (conversationHistory.current.length > 10) {
          conversationHistory.current = conversationHistory.current.slice(-10);
        }
        
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      } else {
        // Demo mode - simulated response
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let response = '';
        if (agent.id === 'emailRewriter') {
          response = `## Suggested Subject
Professional Follow-up: ${userMessage.split(' ').slice(0, 5).join(' ')}...

## Rewritten Email
Dear [Recipient],

I hope this message finds you well. ${userMessage}

Please let me know if you have any questions or require further clarification.

Best regards,
[Your Name]

## Key Changes Made
- Added professional greeting and closing
- Improved sentence structure
- Enhanced clarity and tone

---
⚠️ *Demo Mode: Enter your WatsonX API Key for real AI responses*`;
        } else {
          response = `## Task Analysis
Analyzing: ${userMessage.slice(0, 100)}...

## Estimation Breakdown
| Phase | Effort (Hours) | Notes |
|-------|----------------|-------|
| Analysis | 4-8 | Requirements review |
| Development | 16-24 | Implementation |
| Testing | 8-12 | Unit + Integration |
| Documentation | 2-4 | Updates |
| **Total** | **30-48** | |

## Complexity Assessment
**Level:** Medium
**Justification:** Standard enhancement scope

## Assumptions
- Existing codebase patterns apply
- No major dependencies

## Risks
- Scope creep possible
- Integration complexity

---
⚠️ *Demo Mode: Enter your WatsonX API Key for real AI responses*`;
        }
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ Error: ${err.message}\n\nPlease check your API key and try again.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="agent-chat-container">
      <div className="chat-header">
        <h2>{agent.name}</h2>
        <span className={`agent-badge ${apiKey ? 'live' : ''}`}>
          {apiKey ? '🟢 Live' : '🟡 Demo Mode'}
        </span>
      </div>
      
      {error && (
        <div className="chat-error">
          ⚠️ {error}
        </div>
      )}
      
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ 
                  __html: msg.content
                    .replace(/\n/g, '<br/>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/## (.*?)(<br\/>|$)/g, '<h3>$1</h3>')
                    .replace(/\| (.*?) \|/g, '<span class="table-cell">$1</span>')
                }} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content loading">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={agent.placeholder}
          rows={3}
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? 'Processing...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

// Usage Stats Component
function UsageStats({ usage }) {
  const totalUsed = (usage.emailRewriter || 0) + (usage.bauEstimate || 0);
  const totalLimit = MAX_CALLS_PER_DAY * 2;

  return (
    <div className="usage-stats">
      <h3>📊 Usage Statistics</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Date</span>
          <span className="stat-value">{usage.date || getTodayKey()}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Email Rewriter</span>
          <span className="stat-value">{usage.emailRewriter || 0} / {MAX_CALLS_PER_DAY}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">BAU Estimate</span>
          <span className="stat-value">{usage.bauEstimate || 0} / {MAX_CALLS_PER_DAY}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Today</span>
          <span className="stat-value">{totalUsed} / {totalLimit}</span>
        </div>
      </div>
      <p className="usage-note">
        ⚠️ Each agent is limited to {MAX_CALLS_PER_DAY} calls per day. Usage resets at midnight.
      </p>
    </div>
  );
}

// API Key Configuration Component
function ApiKeyConfig({ apiKey, onApiKeyChange }) {
  const [showKey, setShowKey] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [isEditing, setIsEditing] = useState(!apiKey);

  const handleSave = () => {
    onApiKeyChange(tempKey);
    setIsEditing(false);
    if (tempKey) {
      localStorage.setItem('watsonxApiKey', tempKey);
    } else {
      localStorage.removeItem('watsonxApiKey');
    }
  };

  const handleClear = () => {
    setTempKey('');
    onApiKeyChange('');
    localStorage.removeItem('watsonxApiKey');
    setIsEditing(true);
  };

  return (
    <div className="api-key-config">
      <h3>🔑 WatsonX Configuration</h3>
      {isEditing ? (
        <div className="api-key-form">
          <div className="input-group">
            <input
              type={showKey ? 'text' : 'password'}
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="Enter your WatsonX API Key"
              className="api-key-input"
            />
            <button 
              type="button" 
              className="toggle-visibility"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>
          <div className="api-key-actions">
            <button className="save-btn" onClick={handleSave}>
              {tempKey ? 'Save & Enable Live Mode' : 'Use Demo Mode'}
            </button>
          </div>
          <p className="api-key-hint">
            💡 Get your API key from <a href="https://cloud.ibm.com/iam/apikeys" target="_blank" rel="noopener noreferrer">IBM Cloud IAM</a>
          </p>
        </div>
      ) : (
        <div className="api-key-status">
          <span className={`status-indicator ${apiKey ? 'connected' : 'demo'}`}>
            {apiKey ? '🟢 Connected to WatsonX' : '🟡 Demo Mode'}
          </span>
          {apiKey && (
            <span className="key-preview">
              Key: ****{apiKey.slice(-4)}
            </span>
          )}
          <button className="edit-btn" onClick={() => setIsEditing(true)}>
            Edit
          </button>
          {apiKey && (
            <button className="clear-btn" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Main Dashboard Component
function Dashboard({ onLogout }) {
  const [activeAgent, setActiveAgent] = useState(null);
  const [usage, setUsage] = useState(getUsage());
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('watsonxApiKey') || '';
  });

  const handleSelectAgent = (agent) => {
    // Prevent re-selecting the same agent
    if (activeAgent?.id === agent.id) {
      return;
    }
    
    const currentUsage = getUsage();
    if ((currentUsage[agent.id] || 0) >= MAX_CALLS_PER_DAY) {
      alert(`Daily limit of ${MAX_CALLS_PER_DAY} calls reached for ${agent.name}`);
      return;
    }
    setActiveAgent(agent);
  };

  const handleIncrement = useCallback((agentId) => {
    const newUsage = incrementUsage(agentId);
    setUsage(newUsage);
  }, []);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🤖 IBMDevDay2026 Demo</h1>
        <div className="header-actions">
          <span className="user-info">👤 Demo User</span>
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <main className="dashboard-content">
        <ApiKeyConfig apiKey={apiKey} onApiKeyChange={setApiKey} />

        <section className="agents-section">
          <h2>Available Agents</h2>
          <div className="agents-grid">
            <AgentCard 
              agent={AGENTS.emailRewriter}
              usage={usage}
              onSelect={handleSelectAgent}
              isActive={activeAgent?.id === 'emailRewriter'}
            />
            <AgentCard 
              agent={AGENTS.bauEstimate}
              usage={usage}
              onSelect={handleSelectAgent}
              isActive={activeAgent?.id === 'bauEstimate'}
            />
          </div>
        </section>

        <UsageStats usage={usage} />

        {activeAgent && (
          <section className="chat-section">
            <AgentChat 
              agent={activeAgent} 
              onIncrement={handleIncrement}
              apiKey={apiKey}
            />
          </section>
        )}

        {!activeAgent && (
          <div className="no-agent-selected">
            <p>👆 Select an agent above to start chatting</p>
          </div>
        )}
      </main>

      <footer className="dashboard-footer">
        <p>IBM Dev Day 2026 - AI Agents Demo | Powered by watsonx.ai (Granite 3)</p>
      </footer>
    </div>
  );
}

// Main App Component
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    sessionStorage.getItem('isLoggedIn') === 'true'
  );

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
  };

  return isLoggedIn ? (
    <Dashboard onLogout={handleLogout} />
  ) : (
    <LoginPage onLogin={handleLogin} />
  );
}

export default App;
