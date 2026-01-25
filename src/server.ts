import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import rateLimit from 'express-rate-limit';
import { Director } from './director.js';
import { ResearchData, Fact } from './researcher.js';
import { IcebergGenerator } from './iceberg_generator.js';
import { config } from './config.js';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = config.PORT;

// Security headers
// Security headers with adjusted CSP for CDNs and inline scripts
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            "img-src": ["'self'", "data:", "https://images.unsplash.com", "https://*.google.com"],
            "connect-src": ["'self'", "https://cdn.jsdelivr.net"], // for dynamic imports
        },
    },
}));

// CORS with explicit origin
app.use(cors({
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser with limit
app.use(express.json({ limit: config.JSON_LIMIT }));

// Basic rate limiting
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute per IP
});
app.use('/api/', limiter);

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use(express.static(path.join(__dirname, '../icebergmaker')));

// Route to generate iceberg data
app.post('/api/generate-iceberg', async (req, res) => {
    try {
        const { topic, levels } = req.body as { topic?: string; levels?: number };
        if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
            return res.status(400).json({ error: 'Invalid topic' });
        }
        const safeLevels = Number.isInteger(levels) ? Math.min(Math.max(levels as number, 1), 10) : 5;
        const generator = new IcebergGenerator();
        const data = await generator.generateIcebergData(topic, safeLevels);
        res.json(data);
    } catch (error) {
        logger.error({ err: error }, 'Iceberg generation failed');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to generate image
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body as { prompt?: string };
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return res.status(400).json({ error: 'Prompt required' });
        }
        const generator = new IcebergGenerator();
        const imageUrl = await generator.generateImage(prompt);
        res.json({ url: imageUrl });
    } catch (error) {
        logger.error({ err: error }, 'Image gen error');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to generate video
app.post('/api/generate-video', async (req, res) => {
    try {
        const { topic, researchData, images } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        // We can either use the researchData passed from frontend (if it has it)
        // OR we can just use the topic and do our own research/script generation.
        // The frontend generates "icebergData" which has levels/facts.
        // The Director expects "ResearchData" format { topic, tiers: { surface, deep, abyss } }.

        // Let's adapt the frontend data to our ResearchData format if provided
        let data: ResearchData;

        if (isFrontendIcebergData(researchData)) {
            data = adaptFrontendDataToResearchData(topic, researchData);
        } else {
            logger.warn({ body: req.body }, 'Invalid researchData format received');
            return res.status(400).json({ error: 'Research data from frontend is required and must be in the correct format' });
        }

        logger.info({ topic }, `Received request for topic: ${topic}`);

        const director = new Director(config.ODYSSEY_API_KEY);

        // Use default image in public static folder
        const defaultImagePath = path.join(__dirname, '../icebergmaker/iceberg.jpg');

        const videoUrl = await director.generateVideo(data, defaultImagePath, images);

        res.json({ videoUrl });

    } catch (error) {
        logger.error({ err: error }, 'Error generating video');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Type guards and adapters
interface FrontendIcebergLevel {
    depth: number;
    facts: { name: string; description: string; significance: string }[];
}

interface FrontendIcebergData {
    levels: FrontendIcebergLevel[];
}

function isFrontendIcebergData(data: any): data is FrontendIcebergData {
    return (
        data &&
        Array.isArray(data.levels) &&
        data.levels.every(
            (lvl: any) =>
                typeof lvl.depth === 'number' &&
                Array.isArray(lvl.facts) &&
                lvl.facts.every(
                    (f: any) =>
                        typeof f.name === 'string' &&
                        typeof f.description === 'string' &&
                        typeof f.significance === 'string'
                )
        )
    );
}

function adaptFrontendDataToResearchData(topic: string, data: FrontendIcebergData): ResearchData {
    const surface: Fact[] = [];
    const deep: Fact[] = [];
    const abyss: Fact[] = [];
    const oneThird = Math.ceil(data.levels.length / 3);

    data.levels.forEach((lvl) => {
        const facts = lvl.facts.map((f: any) => ({
            name: f.name,
            description: f.description,
            significance: f.significance,
            imageURL: f.imageURL
        }));
        if (lvl.depth <= oneThird) surface.push(...facts);
        else if (lvl.depth <= oneThird * 2) deep.push(...facts);
        else abyss.push(...facts);
    });

    return {
        topic,
        url: 'generated-from-frontend',
        tiers: { surface, deep, abyss },
    };
}


// Centralized error handler (fallback)
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received: closing server');
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    logger.info('SIGINT received: closing server');
    server.close(() => process.exit(0));
});
