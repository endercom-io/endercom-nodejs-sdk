#!/usr/bin/env ts-node
/**
 * Example: Endercom Agent Server Wrapper (TypeScript)
 *
 * This example demonstrates how to use the Endercom Node.js SDK as a server wrapper
 * with heartbeat and a2a endpoints, similar to the master-orchestrator-endpoint.py structure.
 *
 * To run this example:
 * 1. Install dependencies: npm install express @types/express ts-node
 * 2. Set environment variables:
 *    - FREQUENCY_API_KEY
 *    - FREQUENCY_ID
 *    - AGENT_NAME
 * 3. Run: npx ts-node server-wrapper-example.ts
 */

import {
  Agent,
  AgentOptions,
  ServerOptions,
  Message,
  MessageHandler,
  createServerAgent
} from '../src/index';

// Example message handler
const customMessageHandler: MessageHandler = (message: Message): string => {
  console.log(`Processing message: ${message.content}`);

  // Example: Simple echo with processing
  if (message.content.toLowerCase().includes('hello')) {
    return `Hello! You said: ${message.content}`;
  } else if (message.content.toLowerCase().includes('analyze')) {
    return `Analysis complete for: ${message.content}`;
  } else if (message.content.toLowerCase().includes('status')) {
    return 'Agent is running and ready to process requests.';
  } else {
    return `Processed: ${message.content}`;
  }
};

async function main(): Promise<void> {
  // Configuration
  const agentOptions: AgentOptions = {
    frequencyApiKey: process.env.FREQUENCY_API_KEY || 'your-frequency-api-key',
    frequencyId: process.env.FREQUENCY_ID || 'your-frequency-id',
    agentName: process.env.AGENT_NAME || 'your-agent-name',
    baseUrl: process.env.BASE_URL || 'https://endercom.io'
  };

  const serverOptions: ServerOptions = {
    host: '0.0.0.0',
    port: 8000,
    enableHeartbeat: true,
    enableA2A: true,
    frequencyApiKey: process.env.FREQUENCY_API_KEY // For authentication
  };

  try {
    // Create agent with server wrapper functionality
    const agent = createServerAgent(agentOptions, serverOptions, customMessageHandler);

    console.log('Starting Endercom Agent Server Wrapper...');
    console.log('Available endpoints:');
    console.log('  - GET  /health or /heartbeat - Health check');
    console.log('  - POST /a2a - Agent-to-agent communication');
    console.log('  - GET  / - Service information');
    console.log('');
    console.log('Example API calls:');
    console.log('  curl -H "Authorization: Bearer YOUR_FREQUENCY_API_KEY" http://localhost:8000/health');
    console.log('  curl -H "Authorization: Bearer YOUR_FREQUENCY_API_KEY" -H "Content-Type: application/json" \\');
    console.log('       -d \'{"content": "Hello, agent!"}\' http://localhost:8000/a2a');

    // Run the server
    agent.runServer(serverOptions);

  } catch (error: any) {
    if (error.message?.includes('Express.js')) {
      console.error('Missing dependencies:', error.message);
      console.error('Please install: npm install express @types/express');
    } else {
      console.error('Error starting server:', error);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}