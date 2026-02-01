# IBM Dev Day 2026 - AI Agents Demo Frontend

A React-based frontend application showcasing AI agents powered by IBM WatsonX. This demo includes an Email Rewriter Agent and a BAU Enhancement Estimate Agent.

## 🚀 Features

- **Email Rewriter Agent** - Rewrites emails in professional tone with subject line suggestions
- **BAU Enhancement Estimate Agent** - Provides effort estimates for development tasks
- **WatsonX Integration** - Powered by IBM Granite 3 8B Instruct model
- **Secure Authentication** - Server-side credential validation
- **Usage Tracking** - Daily call limits per agent (200/day)
- **API Key Management** - User-configurable API key stored in browser only

## 📁 Project Structure

```
frontend/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── App.js              # Main React application
│   ├── App.css             # IBM-themed styles
│   └── index.js            # React entry point
├── server.js               # Express backend proxy server
├── Dockerfile              # Production Docker configuration
├── package.json            # Dependencies and scripts
├── .env.example            # Environment variables template
└── README.md               # This file
```

## 🛠️ Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **IBM Cloud CLI** (for deployment)
- **IBM Cloud Account** with access to:
  - Code Engine
  - Container Registry
  - WatsonX.ai

---

## 🏃 Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/gsomnath/IBMDevDay2026.git
cd IBMDevDay2026/frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment (Optional)

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#-environment-variables) section).

### 4. Start Development Server

```bash
npm run dev
```

This starts both:
- React app on port **3000**
- Express backend on port **3001**

### 5. Access the Application

Open http://localhost:3000 in your browser.

**Login Credentials:**
Set via environment variables `DEMO_USER` and `DEMO_PASSWORD` (see `.env.example`).

> ⚠️ **Important:** After login, configure your WatsonX API key in the Settings panel (⚙️ icon) to enable AI features.

---

## ☁️ Deployment to IBM Code Engine

Follow these step-by-step instructions to deploy the frontend to IBM Code Engine.

### Prerequisites Checklist

- [ ] IBM Cloud account with Code Engine access
- [ ] IBM Cloud CLI installed
- [ ] Code Engine plugin installed
- [ ] Container Registry plugin installed
- [ ] GitHub repository with your code

---

### Step 1: Install IBM Cloud CLI

**Windows (PowerShell):**
```powershell
# Download from: https://github.com/IBM-Cloud/ibm-cloud-cli-release/releases
# Or use winget:
winget install IBM.IBMCloudCLI
```

**macOS:**
```bash
curl -fsSL https://clis.cloud.ibm.com/install/osx | sh
```

**Linux:**
```bash
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh
```

---

### Step 2: Install Required Plugins

```bash
# Install Code Engine plugin
ibmcloud plugin install code-engine

# Install Container Registry plugin
ibmcloud plugin install container-registry
```

Verify installation:
```bash
ibmcloud plugin list
```

---

### Step 3: Login to IBM Cloud

```bash
# Login with SSO (opens browser for authentication)
ibmcloud login --sso
```

When prompted:
1. Select your IBM Cloud account
2. Select your region (e.g., `eu-gb` for UK, `us-south` for Dallas)

---

### Step 4: Target a Resource Group

```bash
# List available resource groups
ibmcloud resource groups

# Target a resource group (usually "Default")
ibmcloud target -g Default
```

---

### Step 5: Create or Select Code Engine Project

**List existing projects:**
```bash
ibmcloud ce project list
```

**Create a new project:**
```bash
ibmcloud ce project create --name my-frontend-project
```

**Select an existing project:**
```bash
ibmcloud ce project select --name my-frontend-project
```

---

### Step 6: Set Up Container Registry

The Container Registry stores your Docker images.

**Set registry region:**
```bash
# Use the region code matching your Code Engine project
ibmcloud cr region-set eu-gb
```

| Region | Registry Server |
|--------|-----------------|
| eu-gb (London) | uk.icr.io |
| us-south (Dallas) | us.icr.io |
| eu-de (Frankfurt) | de.icr.io |
| au-syd (Sydney) | au.icr.io |

**Create a namespace:**
```bash
ibmcloud cr namespace-add mycompany-apps
```

**Create registry secret for Code Engine:**

```bash
# This creates an API key and configures Code Engine to use it
ibmcloud ce registry create \
  --name icr-secret \
  --server uk.icr.io \
  --username iamapikey \
  --password $(ibmcloud iam api-key-create ce-registry-key --output json | jq -r .apikey)
```

> **Note for Windows:** If `jq` is not available, create the API key separately:
> ```bash
> ibmcloud iam api-key-create ce-registry-key
> # Copy the API key value
> ibmcloud ce registry create --name icr-secret --server uk.icr.io --username iamapikey --password <YOUR_API_KEY>
> ```

---

### Step 7: Deploy the Application

**First-time deployment:**

```bash
ibmcloud ce application create \
  --name devday-frontend \
  --build-source https://github.com/gsomnath/IBMDevDay2026 \
  --build-context-dir frontend \
  --strategy dockerfile \
  --registry-secret icr-secret \
  --image uk.icr.io/mycompany-apps/devday-frontend
```

**Explanation of flags:**
| Flag | Description |
|------|-------------|
| `--name` | Application name in Code Engine |
| `--build-source` | GitHub repository URL |
| `--build-context-dir` | Folder containing Dockerfile |
| `--strategy` | Build strategy (dockerfile or buildpacks) |
| `--registry-secret` | Registry credentials created in Step 6 |
| `--image` | Full image path in your registry |

---

### Step 8: Configure Environment Variables

Set the login credentials for your deployment:

```bash
ibmcloud ce application update \
  --name devday-frontend \
  --env DEMO_USER=your_username \
  --env DEMO_PASSWORD=your_secure_password
```

> ⚠️ **Security Warning:** 
> - Never put API keys in environment variables
> - Users enter their own WatsonX API key in the browser UI
> - The API key is stored only in the user's browser localStorage

---

### Step 9: Get Your Application URL

```bash
ibmcloud ce application get --name devday-frontend --output url
```

Your app will be available at a URL like:
```
https://devday-frontend.xxxxx.eu-gb.codeengine.appdomain.cloud
```

---

## 🔄 Updating the Deployment

After making code changes:

### 1. Commit and Push Changes

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

### 2. Rebuild and Redeploy

```bash
ibmcloud ce application update \
  --name devday-frontend \
  --build-source https://github.com/gsomnath/IBMDevDay2026 \
  --build-context-dir frontend
```

This will:
1. Pull latest code from GitHub
2. Build a new Docker image
3. Deploy the new version
4. Route traffic to the new version

---

## 🔧 Environment Variables

| Variable | Description | Default | Where Set |
|----------|-------------|---------|-----------|
| `DEMO_USER` | Login username | `ibmdevday2026` | Code Engine env |
| `DEMO_PASSWORD` | Login password | (built-in default) | Code Engine env |
| `WATSONX_PROJECT_ID` | WatsonX project identifier | (built-in) | Code (not sensitive) |
| `WATSONX_URL` | WatsonX API endpoint | `https://us-south.ml.cloud.ibm.com` | Code (not sensitive) |
| `PORT` | Server port | `8080` | Automatic |
| `NODE_ENV` | Environment mode | `production` | Automatic |

---

## 🔒 Security Best Practices

### API Key Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  API Key entered by user → Stored in localStorage       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (API Key sent with each request)
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS BACKEND                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  API Key used to get IAM token → Calls WatsonX API      │    │
│  │  (Never logged, never stored)                            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         WATSONX API                              │
└─────────────────────────────────────────────────────────────────┘
```

### What's Safe to Commit

| Item | Safe to Commit? | Reason |
|------|-----------------|--------|
| WatsonX Project ID | ✅ Yes | Public identifier, not a secret |
| WatsonX URL | ✅ Yes | Public API endpoint |
| Default demo credentials | ✅ Yes | Can be overridden via env vars |
| WatsonX API Keys | ❌ **NEVER** | Must be user-provided at runtime |
| `.env` files | ❌ **NEVER** | May contain secrets |

### Files Excluded from Git

The `.gitignore` automatically excludes:
- `node_modules/`
- `.env`, `.env.local`, `.env.*.local`
- `build/`
- `*.log`

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start React development server only |
| `npm run server` | Start Express backend only |
| `npm run dev` | Start both React and Express (recommended for development) |
| `npm run build` | Build production React bundle |
| `npm test` | Run tests |
| `npm run start:prod` | Start production server |

---

## 🐳 Docker

### Build Locally

```bash
docker build -t devday-frontend .
```

### Run Locally

```bash
docker run -p 8080:8080 \
  -e DEMO_USER=myuser \
  -e DEMO_PASSWORD=mypassword \
  devday-frontend
```

Access at http://localhost:8080

---

## 🐛 Troubleshooting

### View Application Logs

```bash
ibmcloud ce application logs --name devday-frontend --tail 100
```

### Check Application Status

```bash
ibmcloud ce application get --name devday-frontend
```

### Check Build Status

```bash
ibmcloud ce buildrun list
ibmcloud ce buildrun logs --name <buildrun-name>
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Login fails | Incorrect credentials | Check DEMO_USER and DEMO_PASSWORD env vars |
| "WatsonX API call failed" | Invalid or missing API key | Enter valid WatsonX API key in Settings |
| "Missing project_id" | Server config issue | Redeploy - project ID is built into code |
| Build fails | Missing files | Ensure all files are committed to git |
| Registry permission error | Expired credentials | Recreate registry secret with fresh API key |
| App not loading | Build not complete | Wait for build to finish, check logs |

### Useful Commands

```bash
# List all applications
ibmcloud ce application list

# Delete an application
ibmcloud ce application delete --name devday-frontend

# View build runs
ibmcloud ce buildrun list

# Get detailed app info
ibmcloud ce application get --name devday-frontend
```

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test locally with `npm run dev`
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📞 Support

For issues or questions:
- Open a GitHub issue
- Contact the IBM Dev Day 2026 team

---

## 🙏 Acknowledgments

- IBM WatsonX.ai for the AI capabilities
- IBM Code Engine for serverless hosting
- React team for the excellent framework
