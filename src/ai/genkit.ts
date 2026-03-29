
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

// Enable Firebase telemetry for observability only in production.
// Calling this locally without GOOGLE_APPLICATION_CREDENTIALS causes Node to hang
// for 30+ seconds while trying to reach the GCP Metadata server (169.254.169.254).
if (process.env.NODE_ENV === 'production') {
    enableFirebaseTelemetry();
}

import { getSiteConfig } from '@/lib/data';

// Keep a default instance initialized with environment variables
// This acts as an absolute fallback if DB reading fails completely.
const defaultAi = genkit({
    plugins: [
        googleAI({ apiKey: process.env.GEMINI_API_KEY }),
    ],
});

// A dynamic factory function that ensures we ALWAYS query the SiteConfig
// before instantiating the Genkit AI. This allows the CMS to govern the API Key and model.
export async function getDynamicAi() {
    let apiKey = process.env.GEMINI_API_KEY;
    let modelName = process.env.GEMINI_MODEL ? `googleai/${process.env.GEMINI_MODEL}` : 'googleai/gemini-2.5-flash';

    try {
        const config = await getSiteConfig();
        if (config?.apiKeys?.google?.enabled && config.apiKeys.google.apiKey) {
            apiKey = config.apiKeys.google.apiKey;
            modelName = config.apiKeys.google.model 
                ? `googleai/${config.apiKeys.google.model}` 
                : 'googleai/gemini-2.5-flash';
            
            return {
                ai: genkit({ plugins: [googleAI({ apiKey })] }),
                modelName
            };
        }
    } catch (e) {
        console.error("Failed to load CMS API Config. Falling back to `.env` settings.");
    }

    return {
        ai: defaultAi,
        modelName
    };
}
