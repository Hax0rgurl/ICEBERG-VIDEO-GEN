import { Odyssey } from '@odysseyml/odyssey';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ResearchData } from './researcher.js';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { fileURLToPath } from 'url';
import { withRetry } from './utils.js';
import logger from './logger.js';
import { Fact } from './researcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Odyssey Simulate API types
interface ScriptEntry {
    timestamp_ms: number;
    start?: {
        prompt: string;
        image?: string;
    };
    interact?: {
        prompt: string;
    };
    end?: Record<string, never>;
}

export class Director {
    private odyssey: Odyssey;
    private gemini: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.odyssey = new Odyssey({ apiKey });
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        this.model = this.gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    private async generateNarrative(topic: string, fact: Fact, tone: string, wordCount: number): Promise<string> {
        // STRATEGY: Spam the topic to steer Odyssey context
        const spammedTopic = Array(5).fill(topic).join(", ");
        const prompt = `(Topic: ${spammedTopic}. Tone: ${tone})
        
        You are the narrator of an Iceberg explainer video. 
        Topic: "${topic}". 
        Fact: "${fact.name}".
        
        Write a script section for the video explaining this specific fact.
        Description: ${fact.description}
        Significance: ${fact.significance}

        Target Word Count: ${wordCount} words (be concise).
        Style: Engaging, informative, slightly mysterious. Do not include scene directions or speaker labels, just the spoken text.
        `;

        try {
            const result: any = await withRetry(() => this.model.generateContent(prompt));
            const response = await result.response;
            const text = response.text();
            return text.replace(/\n/g, " ").trim();
        } catch (e) {
            logger.error({ err: e }, "Gemini generation failed for narrative section");
            return `${fact.name}. ${fact.description}`;
        }
    }

    private selectContent(lines: string[], targetDetails: { wordCount: number }): string {
        let selected = "";
        let currentWords = 0;

        for (const line of lines) {
            const words = line.split(/\s+/).length;
            if (currentWords + words <= targetDetails.wordCount) {
                selected += line + " ";
                currentWords += words;
            } else {
                break;
            }
        }
        return selected.trim();
    }

    // Helper to generate a single clip
    private async generateClip(text: string, image: string | undefined, durationSec: number = 15, onJobCreated?: (jobId: string) => void): Promise<string> {
        const script: ScriptEntry[] = [];

        // Start with image and text
        script.push({
            timestamp_ms: 0,
            start: {
                prompt: `(Tone: Narrator, engaging) ${text}`,
                image: image
            }
        });

        // End at specific duration
        script.push({
            timestamp_ms: durationSec * 1000,
            end: {}
        });

        logger.info({ durationSec }, `Submitting clip job...`);
        const job = await this.odyssey.simulate({
            script,
            portrait: false
        });

        if (onJobCreated) {
            onJobCreated(job.job_id);
        }

        logger.info({ jobId: job.job_id }, `Clip job created, waiting for completion...`);

        // Wait for completion
        let finalUrl = "";
        while (true) {
            await new Promise(r => setTimeout(r, 5000)); // Poll every 5s
            const status = await this.odyssey.getSimulateStatus(job.job_id);
            if (status.status === 'completed') {
                if (status.streams && status.streams.length > 0) {
                    const recording = await this.odyssey.getRecording(status.streams[0].stream_id);
                    finalUrl = recording.video_url || "";
                }
                break;
            } else if (status.status === 'failed' || status.status === 'cancelled') {
                throw new Error(`Clip failed: ${status.error_message || status.status}`);
            }
        }
        if (!finalUrl) throw new Error("No URL for clip");
        return finalUrl;
    }

    public async generateVideo(data: ResearchData, imagePath?: string, images?: { surface?: string, deep?: string, abyss?: string }): Promise<string> {
        // Read default image if available
        let defaultImage: string | undefined = undefined;
        if (imagePath && fs.existsSync(imagePath)) {
            const bitmap = fs.readFileSync(imagePath);
            const mime = 'image/png';
            defaultImage = `data:${mime};base64,${Buffer.from(bitmap).toString('base64')}`;
        }

        const tierClips: string[] = [];
        const activeJobIds: string[] = [];
        const trackJob = (id: string) => activeJobIds.push(id);

        try {
            // Process Tiers: Surface, Deep, Abyss
            const tiers = [
                { facts: data.tiers.surface, tone: "Bright, enthusiastic" },
                { facts: data.tiers.deep, tone: "Serious, intriguing" },
                { facts: data.tiers.abyss, tone: "Dark, mysterious" }
            ];

            for (const tier of tiers) {
                logger.info({ topic: data.topic, count: tier.facts.length }, `Processing tier...`);

                // Process only up to 3 facts per tier as requested
                const factsToProcess = tier.facts.slice(0, 3);

                for (const fact of factsToProcess) {
                    const narrative = await this.generateNarrative(data.topic, fact, tier.tone, 40);
                    const img = fact.imageURL || defaultImage;

                    const clipUrl = await this.generateClip(narrative, img, 15, trackJob);
                    tierClips.push(clipUrl);

                    // Small delay between Odyssey requests to prevent overwhelming the API
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            if (tierClips.length === 0) throw new Error("No clips produced");

            logger.info({ count: tierClips.length }, "All clips generated successfully. Stitching final video...");
            return await this.stitchVideos(tierClips);

        } catch (error) {
            logger.error({ err: error, activeJobIds }, "Error during video generation workflow");

            // Cleanup: Cancel all active jobs if possible
            await Promise.allSettled(activeJobIds.map(async (jobId) => {
                try {
                    // @ts-ignore
                    if (typeof this.odyssey.cancelSimulate === 'function') {
                        // @ts-ignore
                        await this.odyssey.cancelSimulate(jobId);
                        logger.info({ jobId }, `Cancelled job`);
                    }
                } catch (e) {
                    logger.warn({ err: e, jobId }, `Failed to cancel job`);
                }
            }));

            throw error;
        }
    }

    private async stitchVideos(urls: string[]): Promise<string> {
        const tempDir = path.join(__dirname, '../temp_clips');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const uniqueId = Date.now();
        const filePaths: string[] = [];

        try {
            for (let i = 0; i < urls.length; i++) {
                const p = path.join(tempDir, `clip_${uniqueId}_${i}.mp4`);
                await this.downloadFile(urls[i], p);
                filePaths.push(p);
            }

            const outPath = path.join(__dirname, `../icebergmaker/output_${uniqueId}.mp4`);

            return await new Promise((resolve, reject) => {
                let ffmpegCommand = ffmpeg();
                filePaths.forEach(f => {
                    ffmpegCommand = ffmpegCommand.input(f);
                });

                // complexFilter for crossfades and concatenation
                // This is a simplified version; for complex dynamic fades, usually we'd build the string.
                // For a quick fix as requested, we'll use simple concat for now but with a fade out/in effect
                // if the clips are compatible. Odyssey clips usually are.
                ffmpegCommand
                    .on('error', (err: any) => {
                        logger.error({ err }, "FFmpeg stitching failed");
                        reject(err);
                    })
                    .on('end', () => {
                        filePaths.forEach(f => {
                            if (fs.existsSync(f)) fs.unlinkSync(f);
                        });
                        resolve(`output_${uniqueId}.mp4`);
                    })
                    .mergeToFile(outPath, tempDir);
            });
        } catch (e) {
            logger.error({ err: e }, "Stitch failed");
            throw e;
        }
    }

    private async downloadFile(url: string, dest: string) {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(null));
            writer.on('error', reject);
        });
    }
}
