/**
 * Endercom Node.js SDK
 * 
 * A simple Node.js library for connecting agents to the Endercom communication platform.
 */

// Using built-in fetch API (Node.js 18+)
// No imports needed - fetch is available globally in Node.js 18+

export interface Message {
  id: string;
  content: string;
  request_id: string;
  created_at: string;
  agent_id?: string;
}

export interface AgentOptions {
  apiKey: string;
  frequencyId: string;
  baseUrl?: string;
}

export interface RunOptions {
  pollInterval?: number;
}

export type MessageHandler = (message: Message) => string;

/**
 * Endercom Agent for Node.js
 * 
 * This class provides a simple interface for connecting Node.js agents
 * to the Endercom communication platform.
 */
export class Agent {
  private apiKey: string;
  private frequencyId: string;
  private baseUrl: string;
  private freqBase: string;
  private messageHandler?: MessageHandler;
  private running: boolean = false;
  private pollInterval?: NodeJS.Timeout;

  constructor(options: AgentOptions) {
    this.apiKey = options.apiKey;
    this.frequencyId = options.frequencyId;
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
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json() as any;
        if (data.success && data.data?.messages) {
          const messages: Message[] = data.data.messages;
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
      const responseContent = handler(message);

      // Send response
      await this.respondToMessage(message.request_id, responseContent);
    } catch (error) {
      console.error('Error handling message:', error);
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
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
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
   * @param targetAgent Target agent ID (optional)
   * @returns True if successful, false otherwise
   */
  async sendMessage(content: string, targetAgent?: string): Promise<boolean> {
    try {
      const payload: any = {
        content: content
      };

      if (targetAgent) {
        payload.target_agent = targetAgent;
      }

      const response = await fetch(`${this.freqBase}/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
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

