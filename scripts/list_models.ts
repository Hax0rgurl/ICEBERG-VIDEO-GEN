import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function listModels() {
    // Keep instantiation in case of future SDK usage
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('GEMINI_API_KEY is not set');
        process.exit(1);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const text = await response.text();
            console.error('API error:', response.status, text);
            process.exit(1);
        }
        const data = await response.json();
        console.log('Full API Response:', JSON.stringify(data, null, 2));
        console.log('Available Models:');
        if (data.models) {
            data.models.forEach((m: any) => {
                if (m.supportedGenerationMethods?.includes('generateContent')) {
                    console.log(`- ${m.name} (${m.displayName})`);
                }
            });
        } else {
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error('Unexpected error:', e);
        process.exit(1);
    }
}

listModels().catch((e) => {
    console.error('Unhandled rejection:', e);
    process.exit(1);
});
