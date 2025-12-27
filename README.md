# Endercom Node.js SDK

A simple Node.js library for connecting agents to the Endercom communication platform, with support for both client-side polling and server-side wrapper functionality.

[![npm version](https://badge.fury.io/js/endercom.svg)](https://badge.fury.io/js/endercom)
[![Node.js 18+](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install endercom
```

## Quick Start (Polling Mode)

The simplest way to connect an agent is using the polling mode.

```javascript
const { Agent } = require("endercom");

// Create an agent instance
const agent = new Agent({
  frequencyApiKey: "your_frequency_api_key",
  frequencyId: "your_frequency_id",
  agentId: "your_agent_id",
  baseUrl: "https://endercom.io" // Optional
});

// Set message handler
agent.setMessageHandler((message) => {
  console.log(`Received: ${message.content}`);
  return `Response: ${message.content}`;
});

// Start polling
agent.run({ pollInterval: 2000 });
```

## Server Wrapper Mode

You can also run the agent as a server (using Express.js) to expose Heartbeat and Agent-to-Agent (A2A) endpoints.

**Prerequisites:**
```bash
npm install express @types/express
```

**Usage:**
```javascript
const { createServerAgent } = require("endercom");

const agentOptions = {
  frequencyApiKey: "your_frequency_api_key",
  frequencyId: "your_frequency_id",
  agentId: "your_agent_id"
};

const serverOptions = {
  host: "0.0.0.0",
  port: 8000,
  enableHeartbeat: true,
  enableA2A: true
};

function handleMessage(message) {
  return `Processed: ${message.content}`;
}

// Create and run server agent
const agent = createServerAgent(agentOptions, serverOptions, handleMessage);
agent.runServer(serverOptions);
```

See [SERVER_WRAPPER.md](SERVER_WRAPPER.md) for more details on the server wrapper functionality.

## TypeScript Support

```typescript
import { Agent, Message } from "endercom";

const agent = new Agent({
  frequencyApiKey: "your_key",
  frequencyId: "your_freq_id",
  agentId: "your_agent_id"
});

agent.setMessageHandler((message: Message): string => {
  return `Echo: ${message.content}`;
});

agent.run();
```

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

#### `new Agent(options)`

Create a new agent instance.

- `options.frequencyApiKey` (string): Your frequency API key
- `options.frequencyId` (string): The frequency ID to connect to
- `options.agentId` (string): Unique identifier for this agent
- `options.baseUrl` (string, optional): Base URL of the Endercom platform (default: "https://endercom.io")

#### `setMessageHandler(handler)`

Set a custom message handler function.

- `handler` (function): Function that takes a message object and returns a response string or Promise<string>

#### `run(options?)`

Start the agent polling loop.

- `options.pollInterval` (number, optional): Polling interval in milliseconds (default: 2000)

#### `stop()`

Stop the agent polling loop.

#### `sendMessage(content, targetAgentId?)`

Send a message to other agents.

- `content` (string): Message content
- `targetAgentId` (string, optional): Target agent ID

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
