#!/usr/bin/env node
/**
 * Data Processor Function - Node.js Example
 * Demonstrates data processing capabilities.
 */

const { AgentFunction } = require('../index.js');

// Create a data processing function
const dataProcessor = new AgentFunction({
    name: 'Data Processor',
    description: 'Processes and analyzes data arrays',
    capabilities: ['analyze', 'process', 'statistics', 'data']
});

// Helper function to calculate standard deviation
function calculateStdDev(numbers, mean) {
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
}

// Set the handler
dataProcessor.setHandler(async (inputData) => {
    try {
        // Extract data array from various input formats
        let data = null;
        if (typeof inputData === 'object' && inputData !== null) {
            data = inputData.data || inputData.numbers || inputData.values;
        } else if (Array.isArray(inputData)) {
            data = inputData;
        }

        if (!data) {
            return {
                error: 'No data found. Expected format: {"data": [1,2,3,4,5]}',
                example: { data: [1, 2, 3, 4, 5] }
            };
        }

        // Convert to numbers if possible
        let numbers;
        try {
            numbers = data.map(x => Number(x));
            if (numbers.some(isNaN)) {
                throw new Error('Invalid numbers in array');
            }
        } catch (error) {
            return {
                error: 'Data must be an array of numbers',
                received: data
            };
        }

        if (numbers.length === 0) {
            return { error: 'Empty data array' };
        }

        // Calculate statistics
        const sum = numbers.reduce((a, b) => a + b, 0);
        const mean = sum / numbers.length;
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        const range = max - min;

        const result = {
            inputData: data,
            processedAt: new Date().toISOString(),
            statistics: {
                count: numbers.length,
                sum: sum,
                mean: parseFloat(mean.toFixed(3)),
                min: min,
                max: max,
                range: range
            }
        };

        // Add additional stats for larger datasets
        if (numbers.length > 1) {
            const sortedNumbers = [...numbers].sort((a, b) => a - b);
            const midIndex = Math.floor(sortedNumbers.length / 2);
            const median = sortedNumbers.length % 2 === 0
                ? (sortedNumbers[midIndex - 1] + sortedNumbers[midIndex]) / 2
                : sortedNumbers[midIndex];

            result.statistics.median = parseFloat(median.toFixed(3));
            result.statistics.stdDev = parseFloat(calculateStdDev(numbers, mean).toFixed(3));
        }

        return result;

    } catch (error) {
        return {
            error: `Processing failed: ${error.message}`,
            inputReceived: inputData
        };
    }
});

// Start the function
if (require.main === module) {
    console.log('Starting Data Processor function...');
    console.log('Example usage:');
    console.log('  POST http://localhost:3002/execute');
    console.log('  Body: {"input": {"data": [1, 2, 3, 4, 5]}}');

    dataProcessor.run(3002);
}