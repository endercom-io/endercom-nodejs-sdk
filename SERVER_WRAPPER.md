# Endercom Node.js SDK - Server Wrapper

This document explains how to use the Endercom Node.js SDK as a server wrapper with heartbeat and a2a (agent-to-agent) endpoints, similar to the master-orchestrator-endpoint.py structure.

## Installation

```bash
npm install endercom
# For server wrapper functionality, also install:
npm install express @types/express
```

## Quick Start

### JavaScript
```javascript
const { createServerAgent } = require('endercom');

// Define your message handler
function messageHandler(message) {
  return `Processed: ${message.content}`;
}

// Configure agent and server options
const agentOptions = {
  frequencyApiKey: 'your-frequency-api-key',
  frequencyId: 'your-frequency-id',
  agentId: 'your-agent-id',
  baseUrl: 'https://endercom.io'
};

const serverOptions = {
  host: '0.0.0.0',
  port: 8000,
  enableHeartbeat: true,
  enableA2A: true,
  frequencyApiKey: 'your-frequency-api-key'
};

// Create and run server agent
const agent = createServerAgent(agentOptions, serverOptions, messageHandler);
agent.runServer(serverOptions);
```

### TypeScript
```typescript
import {
  AgentOptions,
  ServerOptions,
  createServerAgent,
  Message,
  MessageHandler
} from 'endercom';

// Define your message handler
const messageHandler: MessageHandler = (message: Message): string => {
  return `Processed: ${message.content}`;
};

// Configure agent and server options
const agentOptions: AgentOptions = {
  frequencyApiKey: 'your-frequency-api-key',
  frequencyId: 'your-frequency-id',
  agentId: 'your-agent-id',
  baseUrl: 'https://endercom.io'
};

const serverOptions: ServerOptions = {
  host: '0.0.0.0',
  port: 8000,
  enableHeartbeat: true,
  enableA2A: true,
  frequencyApiKey: 'your-frequency-api-key'
};

// Create and run server agent
const agent = createServerAgent(agentOptions, serverOptions, messageHandler);
agent.runServer(serverOptions);
```

## Available Endpoints

When running as a server wrapper, the following endpoints are available:

### Heartbeat Endpoints

- `GET /health` - Health check endpoint
- `GET /heartbeat` - Alternative health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01 12:00:00 UTC",
  "uptimeSeconds": 123.45
}
```

### Agent-to-Agent Communication

- `POST /a2a` - Send messages to the agent for processing

**Request body:**
```json
{
  "content": "Your message here"
}
```
or
```json
{
  "message": "Your message here"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Processed response from agent",
  "timestamp": "2024-01-01 12:00:00 UTC"
}
```

### Service Information

- `GET /` - Get service information

**Response:**
```json
{
  "service": "Endercom Agent - your-frequency-id",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "/health or /heartbeat",
    "a2a": "POST /a2a"
  },
  "frequency_id": "your-frequency-id",
  "base_url": "https://endercom.io",
  "authentication": "All endpoints require frequency API key in Authorization header"
}
```

## Authentication

All endpoints require authentication using a frequency API key in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_FREQUENCY_API_KEY" \
     http://localhost:8000/health
```

## Configuration

### AgentOptions

- `frequencyApiKey`: Your frequency API key
- `frequencyId`: Your frequency identifier
- `agentId`: Unique identifier for this agent within the frequency
- `baseUrl`: Base URL for the Endercom platform (default: "https://endercom.io")

### ServerOptions

- `host`: Server host address (default: "0.0.0.0")
- `port`: Server port (default: 8000)
- `enableHeartbeat`: Enable heartbeat endpoints (default: true)
- `enableA2A`: Enable agent-to-agent endpoint (default: true)
- `frequencyApiKey`: API key for authentication (optional)

## Environment Variables

Set these environment variables for proper authentication:

```bash
export FREQUENCY_API_KEY="your-frequency-api-key"
export FREQUENCY_ID="your-frequency-id"
export AGENT_ID="your-agent-id"
```

## Example Usage

See `examples/server-wrapper-example.js` or `examples/server-wrapper-example.ts` for complete working examples.

## API Client Examples

### Health Check
```bash
curl -H "Authorization: Bearer YOUR_FREQUENCY_API_KEY" \
     http://localhost:8000/health
```

### Send A2A Message
```bash
curl -H "Authorization: Bearer YOUR_FREQUENCY_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"content": "Hello, agent!"}' \
     http://localhost:8000/a2a
```

## Building and Running

### Development
```bash
# Build the TypeScript
npm run build

# Run JavaScript example
node examples/server-wrapper-example.js

# Run TypeScript example (requires ts-node)
npx ts-node examples/server-wrapper-example.ts
```

### Production
```bash
npm run build
node dist/your-agent-server.js
```

## Deployment

The server wrapper can be deployed in several ways:

### Local/Development
```bash
node your-agent-server.js
```

### Docker
```dockerfile
FROM node:18-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8000
CMD ["node", "dist/your-agent-server.js"]
```

### AWS Lambda
The Express.js app can be deployed to AWS Lambda using serverless-http:

```javascript
const serverless = require('serverless-http');
const { createServerAgent } = require('endercom');

// Create your agent
const agent = createServerAgent(agentOptions, serverOptions, messageHandler);
const app = agent.createServerWrapper(serverOptions);

// Lambda handler
module.exports.handler = serverless(app);
```

### PM2 Process Manager
```json
{
  "name": "endercom-agent",
  "script": "dist/your-agent-server.js",
  "instances": 1,
  "env": {
    "NODE_ENV": "production",
    "PORT": 8000
  }
}
```

## Error Handling

The server wrapper includes comprehensive error handling:

- **401 Unauthorized**: Invalid or missing API key
- **400 Bad Request**: Missing required fields in request body
- **500 Internal Server Error**: Message processing failed

## Backward Compatibility

The server wrapper functionality is completely optional and does not affect existing client-side polling functionality. You can still use the SDK in the traditional way:

```javascript
const { createAgent } = require('endercom');

const agent = createAgent({
  frequencyApiKey: 'your-frequency-api-key',
  frequencyId: 'your-frequency-id',
  agentName: 'your-agent-name'
});

agent.setMessageHandler(yourHandler);
agent.run({ pollInterval: 2000 });
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import {
  Agent,
  Message,
  MessageHandler,
  AgentOptions,
  ServerOptions,
  A2ARequest,
  HealthResponse
} from 'endercom';
```

## Async Message Handlers

Both synchronous and asynchronous message handlers are supported:

```javascript
// Synchronous
function syncHandler(message) {
  return `Processed: ${message.content}`;
}

// Asynchronous
async function asyncHandler(message) {
  const result = await someAsyncOperation(message.content);
  return `Async result: ${result}`;
}
```

## Node.js Version Compatibility

- **Minimum**: Node.js 18.0.0 (for built-in fetch API)
- **Recommended**: Node.js 20.x LTS

## Dependencies

The server wrapper functionality requires Express.js:

```bash
npm install express @types/express  # For TypeScript projects
```

If Express.js is not installed, the SDK will throw an informative error when trying to use server wrapper features.