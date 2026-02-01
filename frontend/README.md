# IBMDevDay2026 Demo Frontend

React frontend for IBM Dev Day 2026 AI Agents Demo.

## Features

- 🔐 Simple login authentication
- 🤖 Two embedded watsonx Orchestrate agents
- 📊 Usage tracking (200 calls/day limit per agent)
- 📱 Responsive design

## Agents

1. **Email Rewriter Agent** - Rewrites emails in professional tone
2. **BAU Enhancement Estimate Agent** - Provides development estimates

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start
```

Open [http://localhost:3000](http://localhost:3000)

### Login Credentials

- **Username:** `ibmdevday2026`
- **Password:** `##4456##Dft$ttCdF`

## Build for Production

```bash
npm run build
```

## Deploy to IBM Code Engine

### Option 1: Source Deploy

```bash
ibmcloud ce project select --name your-project
ibmcloud ce app create --name ibmdevday2026-demo --source . --port 8080
```

### Option 2: Docker Deploy

```bash
# Build image
docker build -t ibmdevday2026-demo .

# Tag for IBM Container Registry
docker tag ibmdevday2026-demo us.icr.io/your-namespace/ibmdevday2026-demo:latest

# Push to registry
docker push us.icr.io/your-namespace/ibmdevday2026-demo:latest

# Deploy to Code Engine
ibmcloud ce app create --name ibmdevday2026-demo \
  --image us.icr.io/your-namespace/ibmdevday2026-demo:latest \
  --port 8080
```

## Usage Limits

- Each agent: 200 calls per day
- Usage resets at midnight
- Usage tracked in browser localStorage
