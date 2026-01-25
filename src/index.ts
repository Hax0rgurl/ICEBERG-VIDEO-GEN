#!/usr/bin/env node
import 'dotenv/config'; // loads .env
import inquirer from 'inquirer';
import ora from 'ora';
import { researchTopic } from './researcher.js';
import { Director } from './director.js';
import * as fs from 'fs';

async function main() {
    console.log('Welcome to the Odyssey Iceberg Generator!');

    // check API Key
    if (!process.env.ODYSSEY_API_KEY) {
        console.error('Error: ODYSSEY_API_KEY is not set in environment variables or .env file.');
        process.exit(1);
    }
    if (!process.env.GEMINI_API_KEY) {
        console.error('Error: GEMINI_API_KEY is not set in environment variables or .env file.');
        process.exit(1);
    }

    try {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'topic',
                message: 'Enter the topic for the Iceberg video:',
                validate: (input: string) => input.trim() !== '' ? true : 'Topic cannot be empty.'
            },
            {
                type: 'input',
                name: 'imagePath',
                message: 'Optional: Enter path to Iceberg image (or leave empty):',
            },
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Ready to generate?',
                default: true
            }
        ]);

        if (!answers.confirm) {
            console.log('Aborted.');
            return;
        }

        // 1. Research
        const spinner = ora('Researching topic on Wikipedia...').start();
        let researchData;
        try {
            researchData = await researchTopic(answers.topic);
            spinner.succeed(`Researched: ${researchData.topic}`);
            // Show some stats
            console.log(`  - Surface facts: ${researchData.tiers.surface.length}`);
            console.log(`  - Deep facts: ${researchData.tiers.deep.length}`);
            console.log(`  - Abyss facts: ${researchData.tiers.abyss.length}`);
        } catch (err: any) {
            spinner.fail(`Research failed: ${err.message}`);
            return;
        }

        // 2. Director (Generate Video)
        const director = new Director(process.env.ODYSSEY_API_KEY);
        const defaultImagePath = new URL('./default_iceberg.png', import.meta.url).pathname;
        const imagePath = answers.imagePath ? answers.imagePath.trim() : defaultImagePath;

        if (imagePath && !fs.existsSync(imagePath)) {
            console.warn(`Warning: Image path "${imagePath}" not found. Proceeding without image.`);
        }

        spinner.start('Director is creating the script and submitting job to Odyssey...');
        try {
            const videoUrl = await director.generateVideo(researchData, imagePath);
            spinner.succeed('Video Generation Complete!');
            console.log('\n=======================================');
            console.log('VIDEO READY');
            console.log(`URL: ${videoUrl}`);
            console.log('=======================================\n');
        } catch (err: any) {
            spinner.fail(`Video generation failed: ${err.message}`);
        }

    } catch (error) {
        console.error('An unexpected error occurred:', error);
    }
}

main();
