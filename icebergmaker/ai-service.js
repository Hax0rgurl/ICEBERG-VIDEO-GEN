import { AI_CONFIG } from './config.js';

const domainMapping = {
  food: {
    instructions: `
      Focus on actual findings in food like:
      - Foreign objects found (hair, plastic, metal)
      - Surprising ingredients or contaminants
      - Manufacturing errors or quality control issues
      - Storage or handling incidents
      - Unexpected color changes or reactions
      - Packaging mishaps
      Avoid focusing on deliberately dangerous foods or toxic ingredients.`,
    titles: {
      1: 'Mostly Found',
      2: 'Sometimes Found',
      3: 'Rarely Found',
      4: 'Strangely Found',
      5: 'Unexpectedly Found',
      6: 'Surprisingly Found',
      7: 'Shockingly Found'
    }
  },
  tech: {
    instructions: `
      Focus on actual technology issues like:
      - Software glitches and bugs
      - Hardware malfunctions
      - User interface mistakes
      - Data storage failures
      - Network problems
      - Security vulnerabilities
      Avoid focusing on hypothetical or future technology.`,
    titles: {
      1: 'Consumer Grade',
      2: 'Professional',
      3: 'Cutting Edge',
      4: 'Experimental',
      5: 'Prototype',
      6: 'Classified',
      7: 'Future Tech'
    }
  },
  school: {
    instructions: `
      Focus on actual school incidents like:
      - Unusual classroom events
      - Strange school rules or policies
      - Odd teaching methods
      - Peculiar student traditions
      - Unexpected school facilities
      - Administrative mishaps
      Focus on dangerous or harmful incidents.`,
    titles: {
      1: 'Documented',
      2: 'Lesser Known',
      3: 'Partially Lost',
      4: 'Forgotten',
      5: 'Mysterious',
      6: 'Legendary',
      7: 'Mythical'
    }
  },
  default: {
    instructions: '',
    titles: {
      1: 'Surface Level',
      2: 'Intermediate',
      3: 'Advanced',
      4: 'Expert',
      5: 'Specialist',
      6: 'Master',
      7: 'Ultimate'
    }
  }
};

function determineDomain(topic) {
  const lowerTopic = topic.toLowerCase();
  if (lowerTopic.includes('food') || lowerTopic.includes('cooking') || lowerTopic.includes('cuisine')) {
    return 'food';
  } else if (lowerTopic.includes('tech') || lowerTopic.includes('technology')) {
    return 'tech';
  } else if (lowerTopic.includes('school') || lowerTopic.includes('education')) {
    return 'school';
  }
  return 'default';
}

export async function generateIcebergData(topic, type, levels) {
  try {
    const response = await fetch('/api/generate-iceberg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ topic, levels, type })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    console.log("Iceberg Data Received:", data);
    return data;
  } catch (error) {
    console.error('Error generating iceberg data:', error);
    throw error;
  }
}

export async function generateImage(prompt) {
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    return data.url; // Returns the base64 data:image URL
  } catch (error) {
    console.error('Error with image generation:', error);
    return null; // Fallback handled by scripts.js
  }
}