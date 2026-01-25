# Odyssey Iceberg Generator

This tool researches a topic on Wikipedia and uses the Odyssey Video Agent to generate a 5-minute narrated "Iceberg" video.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the root directory and add your Odyssey API Key:
   ```env
   ODYSSEY_API_KEY=your_key_here
   ```

## Usage

Run the application:
```bash
npm start
```

Follow the CLI prompts:
1. Enter a topic (e.g., "The Matrix", "Super Mario 64").
2. (Optional) Provide a path to an image file (e.g., an iceberg chart) to display at the start.
3. Wait for the research and video generation to complete.

The final video URL will be displayed in the console.

## Structure
- `src/researcher.ts`: Fetches and organizes data from Wikipedia.
- `src/director.ts`: Generates the script and interfaces with Odyssey API.
- `src/index.ts`: CLI entry point.
