import { GoogleGenerativeAI } from '@google/generative-ai';
import { withRetry } from './utils.js';
import logger from './logger.js';

export class IcebergGenerator {
    private model: any;

    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            logger.error("GEMINI_API_KEY is missing from environment");
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    async generateIcebergData(topic: string, levels: number = 5): Promise<any> {
        logger.info({ topic, levels }, "Starting iceberg data generation");

        const prompt = `
        Generate a "Research Iceberg" JSON structure for the topic: "${topic}".
        Total Levels: ${levels}.

        Each level should represent a depth of knowledge/obscurity:
        - Level 1: Surface Level (Common Knowledge)
        - Level ${Math.ceil(levels / 2)}: Intermediate (Specialist Knowledge)
        - Level ${levels}: Abyss (Obscure/Rare/Conspiracy)

        For EACH level, provide exactly 3 facts/entries.
        
        Return a VALID JSON object with this exact schema:
        {
            "levels": [
                {
                    "depth": 1,
                    "title": "Surface Level",
                    "facts": [
                        {
                            "name": "Fact Name",
                            "description": "Short description (2 sentences).",
                            "significance": "Why it matters.",
                            "imagePrompt": "Visual description"
                        }
                    ]
                }
            ]
        }
        
        DO NOT include markdown formatting or backticks. Just the raw JSON string.
        `;

        try {
            const result: any = await withRetry(() => this.model.generateContent(prompt));
            const response = await result.response;
            let text = response.text();

            // Cleanup markdown if present
            if (text.startsWith('```json')) {
                text = text.replace(/```json/g, '').replace(/```/g, '');
            } else if (text.startsWith('```')) {
                text = text.replace(/```/g, '');
            }

            return JSON.parse(text);
        } catch (error) {
            logger.error({ err: error, topic }, "Error generating iceberg data");
            throw error;
        }
    }
    async generateImage(prompt: string): Promise<string> {
        // "Nano Banana" (Gemini 2.5 Flash Image)
        // Note: This model uses generateContent, not predict.

        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
            const imageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

            const enhancedPrompt = `${prompt}, photorealistic, cinematic lighting, 8k, highly detailed, 1920x1080 resolution, 16:9 aspect ratio`;

            const result: any = await withRetry(() => imageModel.generateContent(enhancedPrompt));
            const response = await result.response;

            // Multimodal responses for image generation usually have a part with inlineData
            const parts = response.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find((p: any) => p.inlineData);

            if (imagePart && imagePart.inlineData) {
                return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            }

            // Fallback: check if any part has a text that might be base64 (unlikely for this model but good for robustness)
            throw new Error("No image data found in Nano Banana response");

        } catch (error) {
            logger.error({ err: error, prompt }, "Image generation failed after retries");
            // Fallback to a nice generic AI-looking placeholder or a specific asset
            return "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1024&h=576"; // High-tech fallback
        }
    }
}
