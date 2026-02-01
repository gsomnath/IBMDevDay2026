# IBM Dev Day 2026 - Multi-Agent AI System

A multi-agent AI system for BAU (Business As Usual) enhancement estimation, built with IBM WatsonX Orchestrate and Langflow.

## 🎯 Overview

This project demonstrates a **Multi-Agent Orchestration System** that helps development teams with:
- **Code Analysis** - Review and analyze Spring Boot code patterns
- **Enhancement Recommendations** - Suggest improvements for code quality, performance, and security
- **Effort Estimation** - Provide time and resource estimates for enhancements

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BAU Enhancement Estimate Agent               │
│                    (Supervisor/Orchestrator)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│    │  Code Agent  │   │ Enhancement  │   │  Estimation  │       │
│    │              │   │    Agent     │   │    Agent     │       │
│    └──────┬───────┘   └──────┬───────┘   └──────┬───────┘       │
│           │                  │                   │               │
│    ┌──────▼───────┐   ┌──────▼───────┐   ┌──────▼───────┐       │
│    │  Cloudant    │   │  Cloudant    │   │  Cloudant    │       │
│    │  RAG Vectors │   │  RAG Vectors │   │  RAG Vectors │       │
│    └──────────────┘   └──────────────┘   └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Components

### WatsonX Orchestrate Agents

| Agent | Description |
|-------|-------------|
| **BAUEnhancementEstimateAgent** | Supervisor agent that orchestrates the team. Routes requests to appropriate specialist agents. |
| **EmailRewriterAgent** | Rewrites emails in professional tone and suggests subject lines. |

### Langflow Agents (Deployed in IBM WatsonX Orchestrate)

| Agent | Description | Cloudant Database |
|-------|-------------|-------------------|
| **CodeAgent** | Analyzes Spring Boot code patterns | `rag_vectors_springboot_code` |
| **EnhancementAgent** | Suggests code improvements | `rag_vectors_springboot_enhancement` |
| **EstimationAgent** | Provides effort estimates | `rag_vectors_springboot_estimation` |

### Langflow Agents (Local Development with RAG)

| Agent | Description |
|-------|-------------|
| **RAGCodeAgent** | Local version with RAG for code analysis |
| **RAGEnhancementAgent** | Local version with RAG for enhancement suggestions |
| **RAGEstimationAgent** | Local version with RAG for effort estimation |

### Knowledge Base

The knowledge base contains Spring Boot patterns and best practices:

```
knowledge_base/
├── code/springboot/          # Code patterns & examples
├── enhancement/springboot/   # Enhancement recommendations
└── estimation/springboot/    # Estimation guidelines & historical data
```

## 🚀 Getting Started

### Prerequisites

- IBM Cloud Account
- WatsonX Orchestrate instance
- IBM Cloudant database
- Langflow (for local development)
- Node.js 18+ (for frontend)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/gsomnath/IBMDevDay2026.git
   cd IBMDevDay2026
   ```

2. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run the frontend locally**
   ```bash
   npm run dev
   ```

## 🔧 WatsonX Orchestrate CLI Commands

### Environment Setup

```bash
# Add a new environment (replace with your instance URL)
orchestrate env add -n <ENV_NAME> -u https://api.<REGION>.watson-orchestrate.cloud.ibm.com/instances/<INSTANCE_ID> --type ibm_iam --activate

# Activate an environment
orchestrate env activate <ENV_NAME>

# List available tools
orchestrate tools list
```

### Import Langflow Agents as Tools

```bash
# Import Langflow agents into WatsonX Orchestrate
orchestrate tools import -f "<PATH>/CodeAgent.json" -k langflow
orchestrate tools import -f "<PATH>/EnhancementAgent.json" -k langflow
orchestrate tools import -f "<PATH>/EstimationAgent.json" -k langflow
```

### Export Agents

```bash
# Export agent configurations
orchestrate agents export --agent-only -n <AGENT_NAME> --output <OUTPUT_FILE>.yaml -k native
```

## 📁 Project Structure

```
IBMDevDay2026/
├── agents/                           # WatsonX Orchestrate agent definitions
│   ├── BAUEnhancementEstimateAgent.yaml
│   └── EmailRewriterAgent.yaml
├── frontend/                         # React frontend application
│   ├── src/
│   ├── public/
│   ├── server.js                     # Express backend proxy
│   ├── Dockerfile
│   └── package.json
├── knowledge_base/                   # RAG knowledge base documents
│   ├── code/springboot/
│   ├── enhancement/springboot/
│   └── estimation/springboot/
├── langflow/                         # Langflow agent flow definitions
│   ├── CodeAgent.json
│   ├── EnhancementAgent.json
│   ├── EstimationAgent.json
│   ├── RAGCodeAgent.json
│   ├── RAGEnhancementAgent.json
│   └── RAGEstimationAgent.json
└── README.md
```

## 🗄️ Cloudant Database Setup

Create the following databases in IBM Cloudant for RAG vector storage:

| Database Name | Purpose |
|---------------|---------|
| `rag_vectors_springboot_code` | Stores code pattern embeddings |
| `rag_vectors_springboot_estimation` | Stores estimation data embeddings |
| `rag_vectors_springboot_enhancement` | Stores enhancement pattern embeddings |

## 🌐 Deployment

### IBM Code Engine

The frontend can be deployed to IBM Code Engine:

```bash
cd frontend
ibmcloud ce application create --name devday-frontend --build-source . --strategy dockerfile
```

## 🔐 Environment Variables

### Frontend (.env)

```env
WATSONX_API_KEY=your_watsonx_api_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
```

## 📝 Usage Examples

### BAU Enhancement Estimate Agent

The supervisor agent can handle requests like:

- "Review this Spring Boot code and estimate the time to fix issues"
- "What improvements are needed for this service and how long will they take?"
- "Analyze this code for security vulnerabilities"

### Email Rewriter Agent

- "Rewrite this email in a professional tone: Hey, can you send me the report ASAP?"

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- IBM WatsonX Orchestrate Team
- Langflow Community
- IBM Dev Day 2026 Organizers
