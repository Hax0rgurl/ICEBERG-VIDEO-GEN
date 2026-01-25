import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function testImage() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('GEMINI_API_KEY is not set');
        process.exit(1);
    }
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

    try {
        const result = await model.generateContent('A cute robot building a server');
        const response = await result.response;
        console.log('Full Response Parts:', JSON.stringify(response.candidates?.[0]?.content?.parts, null, 2));
    } catch (e) {
        console.error('Unexpected error:', e);
        process.exit(1);
    }
}

testImage().catch((e) => {
    console.error('Unhandled rejection:', e);
    process.exit(1);
});
