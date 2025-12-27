#!/usr/bin/env node
/**
 * Web Scraper Function - Node.js Example
 * Demonstrates web scraping and content extraction.
 */

const { AgentFunction } = require('../index.js');
const axios = require('axios');

// Create a web scraping function
const webScraper = new AgentFunction({
    name: 'Web Scraper',
    description: 'Scrapes web pages for content and metadata',
    capabilities: ['scrape', 'web', 'extract', 'html']
});

// Helper function to extract basic metadata from HTML
function extractMetadata(html) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    const descriptionMatch = html.match(/<meta[^>]*name=['"](description|Description)['"]\s*content=['"]([^'"]+)['"]/i);
    const description = descriptionMatch ? descriptionMatch[2] : null;

    const keywordsMatch = html.match(/<meta[^>]*name=['"](keywords|Keywords)['"]\s*content=['"]([^'"]+)['"]/i);
    const keywords = keywordsMatch ? keywordsMatch[2] : null;

    return { title, description, keywords };
}

// Helper function to extract basic text content
function extractTextContent(html) {
    // Very basic text extraction (in production, use a proper HTML parser like cheerio)
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

// Set the handler
webScraper.setHandler(async (inputData) => {
    try {
        // Extract URL from input
        let url = null;
        if (typeof inputData === 'object' && inputData !== null) {
            url = inputData.url || inputData.link || inputData.webpage;
        } else if (typeof inputData === 'string') {
            url = inputData;
        }

        if (!url) {
            return {
                error: 'No URL provided. Expected format: {"url": "https://example.com"}',
                example: { url: 'https://example.com' }
            };
        }

        // Validate URL format
        let validUrl;
        try {
            validUrl = new URL(url);
        } catch (error) {
            return {
                error: 'Invalid URL format',
                provided: url
            };
        }

        console.log(`Scraping: ${url}`);

        // Fetch the webpage
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'EndercomBot/1.0 (Web Scraper Function)'
            }
        });

        const html = response.data;
        const metadata = extractMetadata(html);
        const textContent = extractTextContent(html);

        // Basic analysis
        const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
        const characterCount = textContent.length;

        return {
            url: url,
            scrapedAt: new Date().toISOString(),
            statusCode: response.status,
            contentType: response.headers['content-type'],
            metadata: metadata,
            content: {
                text: textContent.substring(0, 1000) + (textContent.length > 1000 ? '...' : ''), // Limit to first 1000 chars
                fullTextLength: textContent.length,
                wordCount: wordCount,
                characterCount: characterCount
            },
            analysis: {
                hasTitle: !!metadata.title,
                hasDescription: !!metadata.description,
                hasKeywords: !!metadata.keywords,
                contentSize: html.length,
                estimatedReadTime: Math.ceil(wordCount / 200) // Assuming 200 words per minute
            }
        };

    } catch (error) {
        if (error.code === 'ENOTFOUND') {
            return {
                error: 'Website not found or unreachable',
                url: inputData,
                suggestion: 'Check if the URL is correct and the website is accessible'
            };
        } else if (error.code === 'ECONNABORTED') {
            return {
                error: 'Request timeout - website took too long to respond',
                url: inputData
            };
        } else {
            return {
                error: `Scraping failed: ${error.message}`,
                url: inputData
            };
        }
    }
});

// Start the function
if (require.main === module) {
    console.log('Starting Web Scraper function...');
    console.log('Example usage:');
    console.log('  POST http://localhost:3004/execute');
    console.log('  Body: {"input": {"url": "https://example.com"}}');

    webScraper.run(3004);
}