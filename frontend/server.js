/**
 * Backend proxy server for WatsonX API calls
 * This avoids CORS issues when calling IBM Cloud APIs from the browser
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
}

// WatsonX Configuration
// Project ID is not sensitive - it's just an identifier
const WATSONX_PROJECT_ID = process.env.WATSONX_PROJECT_ID || '91146e4b-59e0-4c04-a826-2731457dd287';
const WATSONX_URL = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';

// Get IAM Token
async function getIAMToken(apiKey) {
  const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`IAM token error: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Auth credentials from environment (runtime)
const DEMO_USER = process.env.DEMO_USER || 'ibmdevday2026';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || '##4456##Dft$ttCdF';

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth validation endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === DEMO_USER && password === DEMO_PASSWORD) {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// WatsonX Chat endpoint
app.post('/api/watsonx/chat', async (req, res) => {
  try {
    const { apiKey, messages, systemPrompt } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Get IAM token
    const token = await getIAMToken(apiKey);

    // Build messages with system prompt
    const fullMessages = [
      { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
      ...messages
    ];

    // Call WatsonX
    const response = await fetch(`${WATSONX_URL}/ml/v1/text/chat?version=2024-05-01`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_id: 'ibm/granite-3-8b-instruct',
        project_id: WATSONX_PROJECT_ID,
        messages: fullMessages,
        parameters: {
          max_tokens: 2048,
          temperature: 0.7,
          top_p: 0.9
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('WatsonX error:', error);
      return res.status(response.status).json({ 
        error: error.error?.message || error.message || 'WatsonX API call failed' 
      });
    }

    const data = await response.json();
    res.json({
      content: data.choices[0].message.content,
      usage: data.usage
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate API key endpoint
app.post('/api/watsonx/validate', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ valid: false, error: 'API key is required' });
    }

    // Try to get IAM token
    await getIAMToken(apiKey);
    res.json({ valid: true });

  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid API key' });
  }
});

// Catch-all for React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WatsonX Project: ${WATSONX_PROJECT_ID}`);
  console.log(`🌐 WatsonX URL: ${WATSONX_URL}`);
});
