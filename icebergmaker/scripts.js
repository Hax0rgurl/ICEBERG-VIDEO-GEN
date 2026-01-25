import { generateIcebergData, generateImage } from './ai-service.js';
import { AI_CONFIG } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  const categoryInput = document.getElementById('categoryInput');
  const generateBtn = document.getElementById('generateBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const videoBtn = document.getElementById('videoBtn');
  const tipBtn = document.getElementById('tipBtn');
  const tipsContainer = document.getElementById('tipsContainer');
  const progressBar = document.getElementById('progressBar');
  const icebergChart = document.getElementById('icebergChart');
  const topicType = document.getElementById('topicType');
  const levelCount = document.getElementById('levelCount');
  const noImagesToggle = document.getElementById('noImagesToggle');

  // Create hidden element to store research
  const researchTextEl = document.createElement('div');
  researchTextEl.id = 'researchText';
  researchTextEl.style.display = 'none';
  document.body.appendChild(researchTextEl);

  let icebergData = [];
  let researchContent = '';

  generateBtn.addEventListener('click', () => generateIceberg(categoryInput.value.trim()));
  videoBtn.addEventListener('click', generateVideo);
  downloadBtn.addEventListener('click', downloadAllResearch);
  // tipBtn.addEventListener('click', handleTip);
  topicType.addEventListener('change', updatePlaceholder);

  // Tips loading removed (Websim dependency)

  // Load JSZip once
  let JSZip;
  import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')
    .then(module => {
      JSZip = module.default;
      console.log("JSZip loaded successfully");
    })
    .catch(error => console.error("Error loading JSZip:", error));

  function updatePlaceholder() {
    const type = topicType.value;
    categoryInput.placeholder = type === 'custom'
      ? 'Enter your topic...'
      : type === 'mystery'
        ? 'e.g., Ancient Civilizations, UFO Sightings...'
        : 'e.g., Natural Disasters, Deep Sea Exploration...';
  }

  function getLevelTitle(depth, type) {
    if (type === 'danger') {
      const titles = {
        1: 'Safe',
        2: 'Caution',
        3: 'Warning',
        4: 'Danger',
        5: 'Extreme Danger',
        6: 'Critical',
        7: 'Deadly'
      };
      return titles[depth] || `Level ${depth}`;
    } else if (type === 'mystery') {
      const titles = {
        1: 'Common Knowledge',
        2: 'Lesser Known',
        3: 'Hidden Truth',
        4: 'Obscure',
        5: 'Enigmatic',
        6: 'Forbidden',
        7: 'Ancient Secret'
      };
      return titles[depth] || `Level ${depth}`;
    } else {
      const category = categoryInput.value.toLowerCase();
      let titles;
      if (category.includes('food') || category.includes('cooking') || category.includes('cuisine')) {
        titles = {
          1: 'Mostly Found',
          2: 'Sometimes Found',
          3: 'Rarely Found',
          4: 'Strangely Found',
          5: 'Unexpectedly Found',
          6: 'Surprisingly Found',
          7: 'Shockingly Found'
        };
      } else if (category.includes('science') || category.includes('research') || category.includes('discovery')) {
        titles = {
          1: 'Established Theory',
          2: 'Recent Findings',
          3: 'Ongoing Research',
          4: 'Experimental',
          5: 'Theoretical',
          6: 'Groundbreaking',
          7: 'Revolutionary'
        };
      } else if (category.includes('history') || category.includes('ancient') || category.includes('civilization')) {
        titles = {
          1: 'Documented',
          2: 'Lesser Known',
          3: 'Partially Lost',
          4: 'Forgotten',
          5: 'Mysterious',
          6: 'Legendary',
          7: 'Mythical'
        };
      } else if (category.includes('tech') || category.includes('technology') || category.includes('digital')) {
        titles = {
          1: 'Consumer Grade',
          2: 'Professional',
          3: 'Cutting Edge',
          4: 'Experimental',
          5: 'Prototype',
          6: 'Classified',
          7: 'Future Tech'
        };
      } else if (category.includes('art') || category.includes('culture') || category.includes('creative')) {
        titles = {
          1: 'Mainstream',
          2: 'Underground',
          3: 'Avant-garde',
          4: 'Experimental',
          5: 'Revolutionary',
          6: 'Visionary',
          7: 'Transcendent'
        };
      } else if (category.includes('nature') || category.includes('animal') || category.includes('wildlife')) {
        titles = {
          1: 'Common Species',
          2: 'Rare Finds',
          3: 'Endangered',
          4: 'Near Mythical',
          5: 'Recently Discovered',
          6: 'Unconfirmed',
          7: 'Legendary'
        };
      } else {
        titles = {
          1: 'Surface Level',
          2: 'Intermediate',
          3: 'Advanced',
          4: 'Expert',
          5: 'Specialist',
          6: 'Master',
          7: 'Ultimate'
        };
      }
      return titles[depth] || `Level ${depth}`;
    }
  }

  async function generateIceberg(topic) {
    if (!topic) return;

    const type = topicType.value;
    const levels = parseInt(levelCount.value);

    if (levels < 1) {
      alert('Please select at least 1 level');
      return;
    }

    toggleButtonState(generateBtn, true, 'Generating...');
    resetProgress();
    icebergChart.innerHTML = '';

    try {
      localStorage.setItem('lastTopic', topic);
      setProgress(20); // AI generation started

      // Use the new AI service
      const data = await generateIcebergData(topic, type, levels);
      icebergData = data.levels;



      // Store research content both in element and variable
      researchContent = generateResearchText(icebergData, topic);
      researchTextEl.textContent = researchContent;
      console.log("Research text generated:", researchContent.substring(0, 100) + "...");

      setProgress(50); // AI generation completed

      if (false && !noImagesToggle.checked) {
        await fetchAllImages(icebergData);
      } else {
        setProgress(100);
      }

      displayIceberg(icebergData, type);
      videoBtn.style.display = 'inline-block'; // Show video button

    } catch (error) {
      console.error('Error generating iceberg:', error);
      alert('Error generating iceberg: ' + error.message);
    } finally {
      toggleButtonState(generateBtn, false, 'Generate Iceberg');
      downloadBtn.style.display = 'inline-block';
      videoBtn.style.display = 'inline-block';
      setProgress(100);
    }
  }

  async function generateVideo() {
    const topic = categoryInput.value.trim() || localStorage.getItem('lastTopic');
    if (!topic || icebergData.length === 0) {
      alert("Generate an iceberg first!");
      return;
    }

    toggleButtonState(videoBtn, true, 'Generating Video...');

    try {
      // Select representative images for each tier (Surface, Deep, Abyss)
      // Heuristic: Divide levels into 3 chunks
      const levels = icebergData;
      const oneThird = Math.ceil(levels.length / 3);

      let surfaceImage = null;
      let deepImage = null;
      let abyssImage = null;

      // Find first available image in each tier
      for (const level of levels) {
        const depth = level.depth;
        for (const fact of level.facts) {
          if (fact.imageURL) {
            if (depth <= oneThird && !surfaceImage) surfaceImage = fact.imageURL;
            else if (depth <= oneThird * 2 && depth > oneThird && !deepImage) deepImage = fact.imageURL;
            else if (depth > oneThird * 2 && !abyssImage) abyssImage = fact.imageURL;
          }
        }
      }

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          researchData: { levels: icebergData },
          images: {
            surface: surfaceImage,
            deep: deepImage,
            abyss: abyssImage
          }
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      if (result.videoUrl) {
        showNotification("Video generated! Packaging ZIP...");
        // Automatically trigger the zip download with the video included
        await downloadAllResearch(result.videoUrl);
      }

    } catch (error) {
      console.error("Video generation failed:", error);
      alert("Failed to generate video: " + error.message);
    } finally {
      toggleButtonState(videoBtn, false, '🎥 Make Video');
    }
  }

  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 5000);
  }

  function generateResearchText(levels, topic) {
    let content = `COMPLETE RESEARCH: ${topic.toUpperCase()}\n\n`;

    levels.forEach(level => {
      content += `\n=== Level ${level.depth} - ${getLevelTitle(level.depth, topicType.value)} ===\n\n`;
      level.facts.forEach(fact => {
        content += `--- ${fact.name} ---\n`;
        content += `Description: ${fact.description}\n`;
        content += `Significance: ${fact.significance}\n`;
        if (fact.controversy) content += `Controversy: ${fact.controversy}\n`;
        content += '\n';
      });
    });

    return content;
  }

  async function fetchAllImages(levels) {
    // Flatten all facts into a single array for easier batch processing
    const allFacts = [];
    levels.forEach(level => level.facts.forEach(fact => allFacts.push(fact)));

    const totalFacts = allFacts.length;
    let completedFacts = 0;

    // Use concurrency to speed up processing while being mindful of API limits
    // Parallel processing helps prevent timeouts on large icebergs (like 10 levels)
    const concurrency = 1;

    for (let i = 0; i < totalFacts; i += concurrency) {
      const batch = allFacts.slice(i, i + concurrency);

      // Update UI to show granular progress so user knows it's not stuck
      toggleButtonState(generateBtn, true, `Generating Images (${completedFacts + 1}/${totalFacts})...`);

      await Promise.all(batch.map(async (fact) => {
        await generateImageForFact(fact);
        completedFacts++;

        // Update progress bar
        if (totalFacts > 0) {
          const percent = 50 + ((completedFacts / totalFacts) * 50);
          setProgress(percent);
        }
      }));

      // Add a small delay between batches to respect RPM even more
      if (i + concurrency < totalFacts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    // Final status update
    toggleButtonState(generateBtn, true, `Images (${totalFacts}/${totalFacts})...`);
  }

  async function generateImageForFact(fact) {
    try {
      // Use the AI image generation service
      fact.imageURL = await generateImage(fact.imagePrompt);
    } catch (error) {
      console.error(`Error generating image for "${fact.name}":`, error);
      fact.imageURL = null;
    }
  }

  function displayIceberg(levels, type) {
    icebergChart.innerHTML = '';
    levels.forEach((level) => {
      const levelDiv = document.createElement('div');
      levelDiv.className = 'level';
      levelDiv.setAttribute('data-depth', level.depth);

      const titleEl = document.createElement('h2');
      titleEl.className = 'level-title';
      titleEl.textContent = `Level ${level.depth} - ${getLevelTitle(level.depth, type)}`;
      levelDiv.appendChild(titleEl);

      const entriesList = document.createElement('ul');
      entriesList.className = 'entries';
      level.facts.forEach((fact, i) => {
        const li = document.createElement('li');
        li.textContent = fact.name;
        li.addEventListener('click', () => toggleFactDetails(fact, li));
        li.style.animationDelay = `${(i * 0.1)}s`;
        entriesList.appendChild(li);
      });
      levelDiv.appendChild(entriesList);
      icebergChart.appendChild(levelDiv);
    });
  }

  function toggleFactDetails(fact, element) {
    const existingPanel = element.nextElementSibling;
    if (existingPanel && existingPanel.classList.contains('panel-content')) {
      existingPanel.classList.toggle('active');
    } else {
      const panel = document.createElement('div');
      panel.className = 'panel-content active';
      panel.innerHTML = generateEntryContent(fact);
      element.parentNode.insertBefore(panel, element.nextSibling);

      // Add event listener to the new generate button
      const genBtn = panel.querySelector('.generate-single-btn');
      const promptArea = panel.querySelector('.fact-prompt-input');
      if (genBtn && promptArea) {
        genBtn.addEventListener('click', () => handleGenerateSingleImage(fact, genBtn, promptArea, panel));
      }
    }
  }

  async function handleGenerateSingleImage(fact, button, promptArea, panel) {
    const prompt = promptArea.value.trim();
    if (!prompt) return;

    toggleButtonState(button, true, 'Generating...');
    try {
      const imageUrl = await generateImage(prompt);
      if (imageUrl) {
        fact.imageURL = imageUrl;
        fact.imagePrompt = prompt; // Update the prompt in data too
        // Refresh the panel content
        panel.innerHTML = generateEntryContent(fact);
        // Re-attach listener
        const newGenBtn = panel.querySelector('.generate-single-btn');
        const newPromptArea = panel.querySelector('.fact-prompt-input');
        if (newGenBtn && newPromptArea) {
          newGenBtn.addEventListener('click', () => handleGenerateSingleImage(fact, newGenBtn, newPromptArea, panel));
        }
      } else {
        alert("Failed to generate image.");
      }
    } catch (error) {
      console.error("Manual image generation failed:", error);
      alert("Error: " + error.message);
    } finally {
      toggleButtonState(button, false, 'Generate Photo');
    }
  }

  function generateEntryContent(fact) {
    const imageHtml = fact.imageURL
      ? `<div class="fact-image-container"><img src="${fact.imageURL}" alt="${fact.imagePrompt}" class="fact-image"/></div>`
      : '<div class="fact-image-container no-image"><span>No image generated</span></div>';

    return `
            <div class="fact-details">
              <div class="fact-sidebar">
                ${imageHtml}
                <div class="prompt-box">
                  <label>Image Prompt:</label>
                  <textarea class="fact-prompt-input">${fact.imagePrompt || fact.name}</textarea>
                  <button class="action-button generate-single-btn">Generate Photo</button>
                </div>
              </div>
              <div class="fact-info">
                <h3>${fact.name}</h3>
                <p><strong>Description</strong>: ${fact.description}</p>
                <p><strong>Significance</strong>: ${fact.significance}</p>
                ${fact.controversy ? `<p><strong>Controversy</strong>: ${fact.controversy}</p>` : ''}
              </div>
              <div style="clear: both;"></div>
            </div>`;
  }

  async function downloadAllResearch(videoUrl = null) {
    const category = categoryInput.value.trim();
    if (!category || !icebergData.length) {
      alert('Please generate an iceberg chart first!');
      return;
    }

    if (!JSZip) {
      alert('JSZip library is not loaded yet. Please try again in a few seconds.');
      return;
    }

    toggleButtonState(downloadBtn, true, 'Downloading...');
    resetProgress();

    try {
      // Create new ZIP file
      const zip = new JSZip();
      const imgFolder = zip.folder('images');

      // First, add the text content to the ZIP file
      console.log("Adding research text to ZIP...");
      if (!researchContent) {
        // Regenerate if somehow missing
        researchContent = generateResearchText(icebergData, category);
      }

      const sanitizedCategory = sanitizeFilename(category);
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const zipFileName = `iceberg_${dateStr}_${sanitizedCategory}.zip`;

      zip.file(`${sanitizedCategory}_research.txt`, researchContent);

      // Collect all prompts
      let promptText = "IMAGE PROMPTS:\n\n";
      icebergData.forEach(level => {
        level.facts.forEach(fact => {
          promptText += `Topic: ${fact.name}\nPrompt: ${fact.imagePrompt}\n\n`;
        });
      });
      zip.file(`prompts.txt`, promptText);
      console.log("Text and prompt files added to ZIP");

      // Count total facts for progress calculation
      let totalFacts = 0;
      icebergData.forEach(level => totalFacts += level.facts.length);
      let processedFacts = 0;

      // Process each image if enabled
      if (!noImagesToggle.checked) {
        console.log("Starting to process images...");
        for (const level of icebergData) {
          for (const fact of level.facts) {
            try {
              if (fact.imageURL) {
                console.log(`Processing image for: ${fact.name}`);
                await addImageToZip(imgFolder, fact);
              }
              processedFacts++;
              setProgress((processedFacts / totalFacts) * 100);
            } catch (imageError) {
              console.error(`Failed to add image for "${fact.name}":`, imageError);
              imgFolder.file(`${sanitizeFilename(fact.name)}_error.txt`, `Failed to generate/download image: ${imageError.message}`);
            }
          }
        }
      }

      // Add the video file to the ZIP if provided
      if (videoUrl) {
        try {
          console.log("Fetching video for ZIP...");
          const vResponse = await fetch(videoUrl);
          if (vResponse.ok) {
            const vBlob = await vResponse.blob();
            zip.file(`${sanitizeFilename(category)}_video.mp4`, vBlob);
            console.log("Video added to ZIP");
          }
        } catch (vError) {
          console.error("Failed to add video to ZIP:", vError);
        }
      }

      console.log("Generating ZIP blob...");
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      console.log("ZIP blob generated, size:", zipBlob.size);

      // Trigger the download
      triggerDownload(zipBlob, zipFileName);
      console.log("Download triggered");

    } catch (error) {
      console.error('Error in downloadAllResearch:', error);
      alert('Failed to download: ' + error.message);
    } finally {
      toggleButtonState(downloadBtn, false, 'Download All');
      setProgress(100);
    }
  }

  async function addImageToZip(imgFolder, fact) {
    try {
      // Add unique timestamp to URL to prevent caching issues
      const imageUrl = fact.imageURL + (fact.imageURL.includes('?') ? '&' : '?') + 'cachebust=' + Date.now();
      console.log(`Fetching image from: ${imageUrl}`);

      const response = await fetch(imageUrl, {
        mode: 'cors',
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log(`Image downloaded, size: ${blob.size} bytes`);

      imgFolder.file(`${sanitizeFilename(fact.name)}.jpg`, blob);
      console.log(`Image added to ZIP: ${fact.name}`);
    } catch (error) {
      console.error(`Error in addImageToZip for "${fact.name}":`, error);
      imgFolder.file(`${sanitizeFilename(fact.name)}_error.txt`, `Failed to download image: ${error.message}`);
    }
  }

  function toggleButtonState(button, isLoading, text) {
    button.classList.toggle('generating', isLoading);
    button.textContent = text;
  }

  function resetProgress() {
    setProgress(0);
  }

  function setProgress(percentage) {
    progressBar.style.width = `${percentage}%`;
  }

  function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  // Tip handling removed

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link); // Append to body for Firefox compatibility
    link.click();
    setTimeout(() => {
      document.body.removeChild(link); // Clean up
      URL.revokeObjectURL(url);
    }, 100);
  }

  // Language menu toggle
  const languageMenuBtn = document.querySelector('.language-menu-btn');
  const languageList = document.querySelector('.language-list');
  const languageSelector = document.querySelector('.language-selector');

  if (languageMenuBtn && languageList) {
    languageMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      languageList.classList.toggle('active');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!languageSelector.contains(e.target)) {
        languageList.classList.remove('active');
      }
    });
  }
});