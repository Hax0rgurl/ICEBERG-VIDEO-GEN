import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from './logger.js';

// Set default User-Agent for all axios requests
axios.defaults.headers.common['User-Agent'] = 'OdysseyIcebergGenerator/1.0 (mailto:example@example.com)';

export interface Fact {
    name: string;
    description: string;
    significance: string;
    imageURL?: string;
}

export interface ResearchData {
    topic: string;
    url: string;
    tiers: {
        surface: Fact[];
        deep: Fact[];
        abyss: Fact[];
    };
}

export async function researchTopic(topic: string): Promise<ResearchData> {
    try {
        // 1. Search/Fetch Wikipedia
        // We'll try a direct guess at the URL first, then search api if needed.
        // For simplicity in this demo, we assume the topic maps closely to the URL or we use the search API.
        // Let's use the REST API to get the summary and HTML.

        // First, search to get the correct title/key
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(topic)}&limit=1&format=json`;
        const searchRes = await axios.get(searchUrl);

        if (!searchRes.data[1] || searchRes.data[1].length === 0) {
            throw new Error(`Topic "${topic}" not found on Wikipedia.`);
        }

        const correctTitle = searchRes.data[1][0];
        const articleUrl = searchRes.data[3][0];

        logger.info({ correctTitle, articleUrl }, "Wikipedia research started");

        // Fetch the page content
        const pageRes = await axios.get(articleUrl);
        const $ = cheerio.load(pageRes.data);

        // Remove unwanted elements
        $('.mw-editsection, .reference, .noprint, #mw-navigation, #footer, .mw-jump-link').remove();

        // Extract text organized by structure
        const content: string[] = [];

        // Get the summary (intro before the first h2)
        const summary: string[] = [];
        let summaryEnded = false;

        $('#mw-content-text > .mw-parser-output').children().each((i, el) => {
            if ($(el).is('h2')) {
                summaryEnded = true;
                return false; // break loop
            }
            if (!summaryEnded && $(el).is('p')) {
                const text = $(el).text().trim();
                if (text.length > 50) summary.push(text);
            }
        });

        // Get body sections
        const sections: { title: string, text: string[] }[] = [];
        let currentSection: { title: string, text: string[] } | null = null;

        $('#mw-content-text > .mw-parser-output').children().each((i, el) => {
            if ($(el).is('h2')) {
                if (currentSection) sections.push(currentSection);
                currentSection = { title: $(el).text().trim(), text: [] };
            } else if (currentSection && $(el).is('p')) {
                const text = $(el).text().trim();
                if (text.length > 50) currentSection.text.push(text);
            }
        });
        if (currentSection) sections.push(currentSection);

        // Organize into Tiers
        // Tier 1 (Surface): Summary + maybe first section
        // Tier 2 (Deep): First half of remaining sections
        // Tier 3 (Abyss): Second half of remaining sections

        const relevantSections = sections.filter(s =>
            !['References', 'External links', 'See also', 'Notes'].includes(s.title)
        );

        const surface = summary.map(text => ({ name: "Overview", description: text, significance: "Background" }));

        // If summary is short, add first section to surface
        if (surface.length < 3 && relevantSections.length > 0) {
            const first = relevantSections.shift();
            if (first) {
                surface.push(...first.text.map(text => ({ name: first.title, description: text, significance: "Context" })));
            }
        }

        const midPoint = Math.ceil(relevantSections.length / 2);
        const deepSections = relevantSections.slice(0, midPoint);
        const abyssSections = relevantSections.slice(midPoint);

        const deep = deepSections.flatMap(s => s.text.map(text => ({ name: s.title, description: text, significance: "Deep Research" })));
        const abyss = abyssSections.flatMap(s => s.text.map(text => ({ name: s.title, description: text, significance: "Obscure Detail" })));

        return {
            topic: correctTitle,
            url: articleUrl,
            tiers: {
                surface,
                deep,
                abyss
            }
        };

    } catch (error: any) {
        throw new Error(`Failed to research topic: ${error.message}`);
    }
}
