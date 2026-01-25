# Iceberg Maker & Video Generator

A premium web-based tool to generate deep-dive "Iceberg" charts and automatic videos. 

![Iceberg Maker UI](file:///Users/muse/.gemini/antigravity/brain/cef99a1b-f0f4-46d7-a107-5850d3857712/repo_contents_1769376808917.png)

## 🚀 Features

- **AI-Powered Research**: Dynamically research any topic and organize facts into levels.
- **Manual Image Generation**: Edit prompts and generate images for each fact individually using "Nano Banana".
- **Video Synthesis**: Automatically create a 5-minute narrated video summarizing the iceberg.
- **Premium UI**: Modern, glassmorphism-inspired design with multi-language support.

## 🛠 Model Configuration

This project uses high-performance AI models for different tasks:

### Core Models (Gemini Required)
- **Text Generation**: `gemini-2.5-flash` - Used to research and organize facts.
- **Image Generation**: `gemini-2.5-flash-image` (Nano Banana) - Used for photorealistic fact images.

> [!NOTE]
> If using **Gemini**, only one `GEMINI_API_KEY` is needed for both text and photo generation.
> If you choose to integrate other local models (e.g., via **Ollama**), you may need separate configurations for text/image endpoints.

### Video Generation (Odyssey Required)
- **Video Production**: `Odyssey Video Agent` - Used to synthesize the final video.

## ⚙️ Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   # Gemini API Key (Text & Images)
   GEMINI_API_KEY=your_gemini_api_key

   # Odyssey API Key (Videos)
   ODYSSEY_API_KEY=your_odyssey_api_key
   ```

3. **Start the Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

## 📖 Usage

1. **Enter a Topic**: Type your topic in the input field (e.g., "History of Video Games").
2. **Generate Iceberg**: Click "Generate Iceberg" to research the text.
3. **Generate Photos**: Click on a fact to open its details. Edit the prompt if desired and click "Generate Photo" for that specific section.
4. **Download / Make Video**: Download your full research as a ZIP or trigger the video generation.

## 📂 Structure

- `/icebergmaker`: Frontend web application (HTML/CSS/JS).
- `/src/server.ts`: Express server and API endpoints.
- `/src/iceberg_generator.ts`: Interface for Gemini (Text & Image generation).
- `/src/director.ts`: Interface for Odyssey Video Agent.
