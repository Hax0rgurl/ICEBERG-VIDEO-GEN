# Iceberg Maker & Video Generator

A premium, web-based tool for generating deep-dive “Iceberg” charts and automatically producing narrated videos from those icebergs.

## Overview

This system turns a topic into a structured iceberg (multiple depth levels, each containing curated facts), then converts those facts into a timed visual video sequence. The workflow is intentionally modular: research and structure first, image creation second, then video synthesis, then final assembly.

## Workflow

### 1. Generate the iceberg text (research + level breakdown)

- You enter a topic.
- The system researches the topic and produces an iceberg structure organized by depth levels.
- Each level is broken into 3 sections (facts/entries).
- Output at this stage is the written iceberg content, organized and ready for media generation.

### 2. Convert each section into an image prompt (Nano Banana: text-to-image)

- Each iceberg section becomes a dedicated image prompt.
- You can edit or refine prompts per section before generating an image.
- Images are generated one-by-one so each entry stays aligned with the exact fact it represents.
- Output at this stage is a set of images that map 1:1 to iceberg sections.

### 3. Produce timed clips from text + image

For each section, the system combines:

- The section’s text (for on-screen text and/or narration)
- The section’s image (as the visual)

This creates a timed video segment for that section.

## Timing Rules

- 1 iceberg level = 45 seconds total
- Each level has 3 sections
- Each section gets 15 seconds
- That means: 3 images per level, each displayed for ~15 seconds

So per level:

- Section 1 image: 0:00–0:15
- Section 2 image: 0:15–0:30
- Section 3 image: 0:30–0:45

Output per level: a single 45-second video.

## Multi-Level Output and Full Assembly

- The iceberg has 5 levels total.
- You generate 5 separate 45-second videos (one per level).
- Then you combine them into one longer final video using FFmpeg.

Total runtime if stitched linearly:

- 5 levels × 45 seconds = 225 seconds
- 225 seconds = 3 minutes 45 seconds

(If you extend timing, add intro/outro, or insert transitions, the final runtime increases accordingly.)

## Result

An automated video iceberg maker that converts:

Text research → structured iceberg → per-entry images → per-level videos → final stitched compilation

## Features

### AI-Powered Research

- Dynamically researches any topic.
- Produces a structured iceberg grouped by depth levels.
- Keeps entries organized so they can be processed as discrete “video units.”

### Manual Image Generation (Per Fact)

- Each iceberg fact has its own image prompt.
- Prompts can be edited before generation.
- Images are generated individually via Nano Banana to maintain tight semantic alignment.

### Video Synthesis

- Converts each iceberg level into a timed, narrated video.
- Uses the text as narration input and the image as the visual anchor.
- Produces consistent pacing: 15 seconds per entry, 45 seconds per level.

### Premium UI

- Modern glassmorphism-inspired interface.
- Multi-language support.
- Clear separation between text generation, image generation, and video generation stages.

## Model Configuration

This project uses specialized models per stage, so each task is handled by the best suited system.

### Core Models (Gemini Required)

- Text Generation: `gemini-2.5-flash`  
  Researches the topic and creates the iceberg structure and entries.

- Image Generation: `gemini-2.5-flash-image` (Nano Banana)  
  Generates photorealistic images for each iceberg fact/section.

Note:
- A single GEMINI_API_KEY is used for both text and image generation when using Gemini.

Optional:
- If integrating other local models (for example via Ollama), you may need separate endpoints and environment variables depending on how you wire text and image generation.

### Video Generation (Odyssey Required)

- Video Production: Odyssey Video Agent  
  Synthesizes the video using the prepared assets (text + images).  
  Produces the final narrated and timed output clips.

## Setup

### 1. Install dependencies

    npm install

### 2. Environment configuration

Create a `.env` file in the root directory:

    # Gemini API Key (Text & Images)
    GEMINI_API_KEY=your_gemini_api_key

    # Odyssey API Key (Videos)
    ODYSSEY_API_KEY=your_odyssey_api_key

### 3. Start the server

    npm run dev

Open:

    http://localhost:3000

## Usage

### 1. Enter a topic

Type a topic into the UI input field (example: “History of Video Games”).

### 2. Generate Iceberg

Click “Generate Iceberg” to produce:

- Level 1 through Level 5
- 3 entries per level
- A full structured iceberg ready for media generation

### 3. Generate Photos

For each fact/entry:

- Click the entry to open its detail view
- Review or edit the prompt
- Click “Generate Photo”
- Repeat until the level’s 3 images are complete

### 4. Download / Make Video

- Download the full research as a ZIP (text + structure + assets as supported)

or

- Trigger video generation to render:
  - A 45-second video per level
  - A final stitched video using FFmpeg if configured for compilation

## Project Structure

- `/icebergmaker`  
  Frontend web app (HTML/CSS/JS), UI for generating text, images, and triggering video.

- `/src/server.ts`  
  Express server and API endpoints.

- `/src/iceberg_generator.ts`  
  Gemini interface for text + image generation (research + Nano Banana integration).

- `/src/director.ts`  
  Odyssey Video Agent interface for video synthesis and orchestration.

## Repository

    https://github.com/Hax0rgurl/ICEBERG-VIDEO-GEN.git
