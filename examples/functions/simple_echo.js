#!/usr/bin/env node
/**
 * Simple Echo Function - Node.js Example
 * Demonstrates the simplest possible Endercom agent function.
 */

const { AgentFunction } = require('../index.js');

// Create a simple function that echoes back whatever it receives
const echoFunction = new AgentFunction({
    name: 'Simple Echo',
    description: 'Echoes back any input it receives',
    capabilities: ['echo', 'test']
});

// Set the handler
echoFunction.setHandler((inputData) => {
    return {
        originalInput: inputData,
        message: 'Echo from Node.js function!',
        type: typeof inputData,
        timestamp: Date.now()
    };
});

// Start the function
if (require.main === module) {
    echoFunction.run(3001);
}