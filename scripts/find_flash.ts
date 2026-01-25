import 'dotenv/config';

async function findFlashModels() {
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

        if (data.models) {
            console.log('Found Flash Models:');
            data.models.forEach((m: any) => {
                if (m.name.toLowerCase().includes('flash') && m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`Model: ${m.name}`);
                    console.log(`methods: ${m.supportedGenerationMethods}`);
                }
            });
        } else {
            console.log('No models found or error structure:', data);
        }
    } catch (e) {
        console.error('Unexpected error:', e);
        process.exit(1);
    }
}

findFlashModels().catch((e) => {
    console.error('Unhandled rejection:', e);
    process.exit(1);
});
