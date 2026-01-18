const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

function getEnvValue(key) {
    const files = ['.env', 'local.env'];
    for (const file of files) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            const match = content.match(new RegExp(`^${key}=(.+)`, 'm'));
            if (match) {
                return match[1].trim();
            }
        }
    }
    return process.env[key];
}

const apiKey = getEnvValue('GEMINI_API_KEY');
if (!apiKey) {
    console.error('No GEMINI_API_KEY found in .env or local.env or environment');
    process.exit(1);
}

// ... rest of script using apiKey ...


async function listModels() {
    // apiKey is already retrieved above globally


    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        // Access the model manager (not directly exposed in all SDK versions, but let's try via a known pattern or just standard getGenerativeModel list?)
        // Actually, listing models is usually done via direct API call or specific SDK method if available.
        // The Node SDK usually supports it via `genAI.getGenerativeModel` but listing might be on the referenced `GoogleAIFileManager` or similar? 
        // Wait, version 0.1.x of SDK might not have listModels.
        // Let's try basic fetching of a known model to verify key first, 
        // or just try to use the raw API endpoint which the SDK might wrap?
        // Actually, newer SDKs export a top level `GoogleGenerativeAI` class.
        // But listing models is often `genAI.getGenerativeModel({ model: ... })` ...
        // Wait, the error message literally said "Call ListModels".
        // That implies it's an API method.

        // Let's try a direct fetch to the API endpoint using the key, to avoid SDK version prowess issues.
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log('Available Models:');
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name} (${m.displayName})`);
                }
            });
        } else {
            console.log('No models found or error:', data);
        }

    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
