
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

// Enable Firebase telemetry for observability only in production.
// Calling this locally without GOOGLE_APPLICATION_CREDENTIALS causes Node to hang
// for 30+ seconds while trying to reach the GCP Metadata server (169.254.169.254).
if (process.env.NODE_ENV === 'production') {
    enableFirebaseTelemetry();
}

// Initialize Genkit with the Google AI plugin, ensuring the API key from environment variables is used.
export const ai = genkit({
    plugins: [
        googleAI({ apiKey: process.env.GEMINI_API_KEY }),
    ],
});

// Helper function to get the configured AI model name as a string.
// The `ai` object will resolve this string to the correct, authenticated model instance.
export function getModelByName() {
    return process.env.GEMINI_MODEL ? `googleai/${process.env.GEMINI_MODEL}` : 'googleai/gemini-1.5-pro-latest';
}
