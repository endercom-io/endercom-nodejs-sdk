/**
 * Endercom Node.js SDK
 *
 * A simple Node.js library for connecting agents to the Endercom communication platform,
 * with support for both client-side polling and server-side wrapper functionality.
 */

// Using built-in fetch API (Node.js 18+)
// No imports needed - fetch is available globally in Node.js 18+

// Optional Express.js support for server wrapper functionality
let express: any;
let expressAvailable = false;
try {
  express = require('express');
  expressAvailable = true;
} catch (error) {
  // Express.js not available, server wrapper functionality disabled
}

export interface Message {
  id: string;
  content: string;
  request_id: string;
  created_at: string;
  agent_id?: string;
  metadata?: Record<string, any>;
}

export interface AgentOptions {
  frequencyApiKey: string;
  frequencyId: string;
  agentId: string;
  baseUrl?: string;
}

export interface RunOptions {
  pollInterval?: number;
}

export interface ServerOptions {
  host?: string;
  port?: number;
  enableHeartbeat?: boolean;
  enableA2A?: boolean;
  frequencyApiKey?: string;
}

export interface A2ARequest {
  content?: string;
  message?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptimeSeconds?: number;
}

export type MessageHandler = (message: Message) => string | Promise<string>;

/**
 * Endercom Agent for Node.js
 *
 * This class provides a simple interface for connecting Node.js agents
 * to the Endercom communication platform, with support for both client-side
 * polling and server-side wrapper functionality.
 */
export class Agent {
  private frequencyApiKey: string;
  private frequencyId: string;
  private agentId: string;
  private baseUrl: string;
  private freqBase: string;
  private messageHandler?: MessageHandler;
  private running: boolean = false;
  private pollInterval?: NodeJS.Timeout;

  // Server wrapper properties
  private app?: any;
  private startupTime?: number;

  constructor(options: AgentOptions) {
    this.frequencyApiKey = options.frequencyApiKey;
    this.frequencyId = options.frequencyId;
    this.agentId = options.agentId;
    this.baseUrl = (options.baseUrl || 'https://endercom.io').replace(/\/$/, '');
    this.freqBase = `${this.baseUrl}/api/${this.frequencyId}`;
  }

  /**
   * Set a custom message handler function.
   * 
   * @param handler Function that takes a message object and returns a response string
   */
  setMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /**
   * Default message handler that echoes the received message.
   * 
   * @param message The received message
   * @returns Response string
   */
  private defaultMessageHandler(message: Message): string {
    console.log(`received: ${message.content}`);
    return `Echo: ${message.content}`;
  }

  /**
   * Internal method to poll for messages.
   */
  private async pollMessages(): Promise<void> {
    try {
      const response = await fetch(`${this.freqBase}/messages/poll`, {
        headers: {
          'Authorization': `Bearer ${this.frequencyApiKey}`,
          'Content-Type': 'application/json',
          'X-Agent-Id': this.agentId
        }
      });

      if (response.ok) {
        const data = await response.json() as any;
        if (data.success && data.data?.messages) {
          const messages: Message[] = data.data.messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            request_id: msg.request_id,
            created_at: msg.created_at,
            agent_id: msg.agent_id,
            metadata: msg.metadata || {},
          }));
          for (const message of messages) {
            await this.handleMessage(message);
          }
        }
      } else {
        console.error(`Polling error: ${response.status}`);
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  }

  /**
   * Handle a received message.
   * 
   * @param message The message to handle
   */
  private async handleMessage(message: Message): Promise<void> {
    try {
      // Use custom handler if set, otherwise use default
      const handler = this.messageHandler || this.defaultMessageHandler;
      let responseContent = handler(message);

      // If handler returns a Promise, await it
      if (responseContent instanceof Promise) {
        responseContent = await responseContent;
      }

      // Check if there's a response_url in metadata (for talk endpoint)
      if (message.metadata && message.metadata.response_url) {
        await this.respondViaHttp(
          message.metadata.response_url,
          message.metadata.request_id || message.request_id,
          responseContent
        );
      } else {
        // Send response via normal message queue
        await this.respondToMessage(message.request_id, responseContent);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Send a response via HTTP POST to a response URL (for talk endpoint).
   * 
   * @param responseUrl The URL to POST the response to
   * @param requestId The request ID
   * @param content The response content
   */
  private async respondViaHttp(responseUrl: string, requestId: string, content: string): Promise<void> {
    try {
      const payload = {
        request_id: requestId,
        content: content
      };

      const response = await fetch(responseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`HTTP response error: ${response.status}`);
      }
    } catch (error) {
      console.error('Network error sending HTTP response:', error);
    }
  }

  /**
   * Send a response to a message.
   * 
   * @param requestId The request ID to respond to
   * @param content The response content
   */
  private async respondToMessage(requestId: string, content: string): Promise<void> {
    try {
      const payload = {
        request_id: requestId,
        content: content
      };

      const response = await fetch(`${this.freqBase}/messages/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.frequencyApiKey}`,
          'Content-Type': 'application/json',
          'X-Agent-Id': this.agentId
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`Response error: ${response.status}`);
      }
    } catch (error) {
      console.error('Network error sending response:', error);
    }
  }

  /**
   * Send a message to other agents.
   *
   * @param content Message content
   * @param targetAgentId Target agent ID (optional, for routing to specific agent)
   * @returns True if successful, false otherwise
   */
  async sendMessage(content: string, targetAgentId?: string): Promise<boolean> {
    try {
      const payload: any = {
        content: content
      };

      if (targetAgentId) {
        payload.target_agent = targetAgentId;
      }

      const response = await fetch(`${this.freqBase}/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.frequencyApiKey}`,
          'Content-Type': 'application/json',
          'X-Agent-Id': this.agentId
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  /**
   * Send a message to a specific agent using the talk endpoint and optionally wait for response.
   *
   * @param targetAgentId Target agent ID (user-provided identifier)
   * @param content Message content
   * @param awaitResponse Whether to wait for response (default: true)
   * @param timeout Timeout in milliseconds (default: 60000 = 60 seconds)
   * @returns Response content if awaitResponse is true, null otherwise
   */
  async talkToAgent(
    targetAgentId: string,
    content: string,
    awaitResponse: boolean = true,
    timeout: number = 60000
  ): Promise<string | null> {
    try {
      const payload = {
        content: content,
        await: awaitResponse,
        timeout: timeout
      };

      const response = await fetch(`${this.baseUrl}/api/${this.frequencyId}/agents/${targetAgentId}/talk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.frequencyApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`Talk endpoint error: ${response.status}`);
        return null;
      }

      const data = await response.json() as any;
      if (!data.success) {
        console.error(`Talk endpoint error: ${data.error}`);
        return null;
      }

      // If awaitResponse is true, return the response content
      if (awaitResponse && data.data && data.data.response) {
        return data.data.response.content;
      }

      return null;
    } catch (error) {
      console.error('Error talking to agent:', error);
      return null;
    }
  }

  /**
   * Start the agent polling loop.
   * 
   * @param options Configuration options
   */
  run(options: RunOptions = {}): void {
    if (this.running) {
      console.log('Agent is already running');
      return;
    }

    const pollInterval = options.pollInterval || 2000;
    this.running = true;

    console.log(`Agent started, polling every ${pollInterval}ms`);
    console.log('Press Ctrl+C to stop');

    // Start polling
    const poll = async () => {
      if (this.running) {
        await this.pollMessages();
        this.pollInterval = setTimeout(poll, pollInterval);
      }
    };

    poll();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });
  }

  /**
   * Stop the agent polling loop.
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
    }

    console.log('Agent stopped');
  }

  // Server wrapper functionality

  /**
   * Verify that the provided API key matches the configured frequency API key.
   */
  private async verifyFrequencyApiKey(apiKey: string): Promise<boolean> {
    // Simple API key validation - just check if it matches the configured key
    return apiKey === this.frequencyApiKey;
  }

  /**
   * Middleware to authenticate requests using frequency API key.
   */
  private async authenticateFrequency(req: any, res: any, next: any): Promise<void> {
    const authorization = req.headers.authorization;

    if (!authorization) {
      res.status(401).json({
        error: 'Missing Authorization header. Provide: Authorization: Bearer {frequency_api_key}',
      });
      return;
    }

    // Extract the API key from "Bearer {key}" format
    const parts = authorization.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      res.status(401).json({
        error: 'Invalid Authorization header format. Use: Bearer {frequency_api_key}',
      });
      return;
    }

    const apiKey = parts[1].trim();
    if (!apiKey) {
      res.status(401).json({
        error: 'API key is empty',
      });
      return;
    }

    // Verify the API key
    const isValid = await this.verifyFrequencyApiKey(apiKey);
    if (!isValid) {
      res.status(401).json({
        error: 'Invalid frequency API key. The provided key does not match this frequency\'s auth_key.',
      });
      return;
    }

    next();
  }

  /**
   * Create an Express.js server wrapper that exposes heartbeat and a2a endpoints.
   */
  createServerWrapper(serverOptions: ServerOptions): any {
    if (!expressAvailable) {
      throw new Error(
        'Express.js is required for server wrapper functionality. Install it with: npm install express @types/express'
      );
    }

    this.startupTime = Date.now();
    this.app = express();

    // Parse JSON bodies
    this.app.use(express.json());

    // Authentication middleware
    const authMiddleware = this.authenticateFrequency.bind(this);

    // Add heartbeat endpoint if enabled
    if (serverOptions.enableHeartbeat !== false) {
      this.app.get('/health', authMiddleware, (req: any, res: any) => {
        const uptime = this.startupTime ? (Date.now() - this.startupTime) / 1000 : 0;
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'),
          uptimeSeconds: Math.round(uptime * 100) / 100,
        });
      });

      this.app.get('/heartbeat', authMiddleware, (req: any, res: any) => {
        const uptime = this.startupTime ? (Date.now() - this.startupTime) / 1000 : 0;
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'),
          uptimeSeconds: Math.round(uptime * 100) / 100,
        });
      });
    }

    // Add a2a endpoint if enabled
    if (serverOptions.enableA2A !== false) {
      this.app.post('/a2a', authMiddleware, async (req: any, res: any) => {
        try {
          const { content, message } = req.body as A2ARequest;
          const messageContent = content || message;

          if (!messageContent) {
            res.status(400).json({
              error: 'Either \'content\' or \'message\' field is required in the request body',
            });
            return;
          }

          // Create a mock message for processing
          const mockMessage: Message = {
            id: `a2a_${Date.now()}`,
            content: messageContent,
            request_id: `a2a_req_${Date.now()}`,
            created_at: new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'),
            agent_id: undefined,
            metadata: {},
          };

          // Process with message handler
          const handler = this.messageHandler || this.defaultMessageHandler;
          let responseContent = handler(mockMessage);

          // Handle async handlers
          if (responseContent instanceof Promise) {
            responseContent = await responseContent;
          }

          res.json({
            success: true,
            response: responseContent,
            timestamp: new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'),
          });
        } catch (error) {
          res.status(500).json({
            error: `Message processing failed: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      });
    }

    // Add root endpoint with service information
    this.app.get('/', authMiddleware, (req: any, res: any) => {
      res.json({
        service: `Endercom Agent - ${this.agentId}`,
        version: '1.0.0',
        status: 'running',
        agent_id: this.agentId,
        frequency_id: this.frequencyId,
        endpoints: {
          health: serverOptions.enableHeartbeat !== false ? '/health or /heartbeat' : 'disabled',
          a2a: serverOptions.enableA2A !== false ? 'POST /a2a' : 'disabled',
        },
        base_url: this.baseUrl,
        authentication: 'All endpoints require frequency API key in Authorization header',
      });
    });

    return this.app;
  }

  /**
   * Run the agent as a server wrapper with heartbeat and a2a endpoints.
   */
  runServer(serverOptions: ServerOptions = {}): void {
    const app = this.createServerWrapper(serverOptions);
    const host = serverOptions.host || '0.0.0.0';
    const port = serverOptions.port || 8000;

    console.log('Starting Endercom Agent server wrapper');
    console.log(`Agent ID: ${this.agentId}`);
    console.log(`Frequency ID: ${this.frequencyId}`);
    console.log(`Frequency ID: ${this.frequencyId}`);
    console.log(`Host: ${host}`);
    console.log(`Port: ${port}`);
    console.log(`Heartbeat endpoint: ${serverOptions.enableHeartbeat !== false ? 'enabled' : 'disabled'}`);
    console.log(`A2A endpoint: ${serverOptions.enableA2A !== false ? 'enabled' : 'disabled'}`);

    app.listen(port, host, () => {
      console.log(`Server listening on http://${host}:${port}`);
    });
  }
}

/**
 * Create a new Endercom agent.
 *
 * @param options Agent configuration options
 * @returns Agent instance
 */
export function createAgent(options: AgentOptions): Agent {
  return new Agent(options);
}

/**
 * Create a new Endercom agent configured for server wrapper functionality.
 *
 * @param agentOptions Agent configuration options
 * @param serverOptions Server configuration options
 * @param messageHandler Optional message handler function
 * @returns Agent instance configured for server wrapper
 */
export function createServerAgent(
  agentOptions: AgentOptions,
  serverOptions: ServerOptions,
  messageHandler?: MessageHandler
): Agent {
  const agent = new Agent(agentOptions);
  if (messageHandler) {
    agent.setMessageHandler(messageHandler);
  }
  return agent;
}

