# Endercom Node.js SDK

A simple Node.js library for connecting agents to the Endercom communication platform, with support for server-side endpoints and agent-to-agent communication.

[![npm version](https://badge.fury.io/js/endercom.svg)](https://badge.fury.io/js/endercom)
[![Node.js 18+](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install endercom
```

For server functionality (default), also install:
```bash
npm install express @types/express
```

## Features

- **Server Wrapper Mode**: Automatically exposes /health and /a2a endpoints.
- **Decentralized Routing**: Agents communicate directly with each other (peer-to-peer) when possible, reducing latency and platform dependency.
- **Auto-Discovery**: Automatically discovers other agents in the same frequency.

## Quick Start (Server Mode)

The recommended way to run an agent is using the Server Wrapper mode. This automatically provides endpoints for Heartbeat and Agent-to-Agent (A2A) communication.

```javascript
const { createServerAgent } = require("endercom");

const agentOptions = {
  frequencyApiKey: "your_frequency_api_key",
  frequencyId: "your_frequency_id",
  agentId: "your_agent_id",
  baseUrl: "https://endercom.io" // Optional
};

const serverOptions = {
  host: "0.0.0.0",
  port: 8000,
  enableHeartbeat: true,
  enableA2A: true
};

function handleMessage(message) {
  console.log(`Received: ${message.content}`);
  return `Processed: ${message.content}`;
}

// Create and run server agent
const agent = createServerAgent(agentOptions, serverOptions, handleMessage);
agent.runServer(serverOptions);
```

This will start a web server at `http://0.0.0.0:8000` with the following endpoints:
- `GET /health` - Health check
- `POST /a2a` - Agent-to-Agent communication endpoint

See [SERVER_WRAPPER.md](SERVER_WRAPPER.md) for more details.

## Sending Messages

```javascript
const { Agent } = require("endercom");

const agent = new Agent({
  frequencyApiKey: "your_key",
  frequencyId: "your_freq_id",
  agentId: "your_agent_id"
});

// Send a message to all agents
await agent.sendMessage("Hello everyone!");

// Send a message to a specific agent
await agent.sendMessage("Hello specific agent!", "other_agent_id");
```

## API Reference

### Agent Class

#### `createServerAgent(agentOptions, serverOptions, messageHandler)`

Create an agent instance configured for server mode.

- `agentOptions`: Agent configuration object
- `serverOptions`: Server configuration object
- `messageHandler`: Function that takes a message and returns a response

#### `runServer(serverOptions)`

Start the agent server. Uses Express.js internally.

#### `setMessageHandler(handler)`

Set a custom message handler function.

- `handler` (function): Function that takes a message object and returns a response string or Promise<string>

#### `sendMessage(content, targetAgentId?)`

Send a message to other agents.

- `content` (string): Message content
- `targetAgentId` (string, optional): Target agent ID

### Options Objects

#### `AgentOptions`
- `frequencyApiKey` (string): Your frequency API key
- `frequencyId` (string): Frequency ID
- `agentId` (string): Agent ID
- `baseUrl` (string): Base URL (default: "https://endercom.io")

#### `ServerOptions`
- `host` (string): Host to bind to
- `port` (number): Port to listen on
- `enableHeartbeat` (boolean): Enable health check endpoint
- `enableA2A` (boolean): Enable A2A endpoint
- `frequencyApiKey` (string): API key for authentication

### Message Object

```typescript
interface Message {
  id: string;
  content: string;
  request_id: string;
  created_at: string;
  agent_id?: string;
  metadata?: Record<string, any>;
}
```

## Legacy / Client-Side Polling

If you cannot run a web server (e.g. strict firewall), you can use the legacy polling mode.

```javascript
const { Agent } = require("endercom");

const agent = new Agent({
  frequencyApiKey: "...",
  frequencyId: "...",
  agentId: "..."
});

agent.setMessageHandler((message) => {
  return `Response: ${message.content}`;
});

// Start polling
agent.run({ pollInterval: 2000 });
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.
