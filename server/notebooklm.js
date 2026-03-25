import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(__dirname, 'sessions', 'notebooklm');
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
const NOTEBOOKLM_URL = 'https://notebooklm.google.com/';

let browser = null;
let browserContext = null;

// Ensure directories exist
fs.mkdirSync(SESSIONS_DIR, { recursive: true });
fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

async function getContext() {
  if (browserContext) return browserContext;

  browser = await chromium.launchPersistentContext(SESSIONS_DIR, {
    headless: false, // Must be visible for Google login
    acceptDownloads: true,
    downloadsPath: DOWNLOADS_DIR,
    viewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  browserContext = browser;
  return browserContext;
}

export async function getAuthStatus() {
  try {
    const ctx = await getContext();
    const page = await ctx.newPage();

    await page.goto(NOTEBOOKLM_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const url = page.url();
    const isLoggedIn = !url.includes('accounts.google.com') && !url.includes('signin');

    await page.close();
    return { loggedIn: isLoggedIn, url };
  } catch (err) {
    return { loggedIn: false, error: err.message };
  }
}

export async function openLoginPage() {
  const ctx = await getContext();
  const page = await ctx.newPage();
  await page.goto(NOTEBOOKLM_URL);
  // Page stays open for manual login - user logs in via the visible browser window
  return { message: 'Browser opened. Please log in with Google in the browser window.' };
}

export async function getNotebooks() {
  const ctx = await getContext();
  const page = await ctx.newPage();

  try {
    await page.goto(NOTEBOOKLM_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check if we're on the login page
    if (page.url().includes('accounts.google.com')) {
      await page.close();
      return { error: 'Not logged in', needsLogin: true };
    }

    // Wait for notebooks to load - NotebookLM shows notebooks in a grid
    await page.waitForSelector(
      '[data-testid="notebook-card"], .notebook-card, project-card, .project-item, [aria-label*="notebook"], [aria-label*="Notebook"]',
      { timeout: 15000 }
    ).catch(() => null);

    await page.waitForTimeout(2000);

    // Extract notebooks using multiple selector strategies
    const notebooks = await page.evaluate(() => {
      const results = [];

      // Strategy 1: Look for notebook cards with links
      const links = Array.from(document.querySelectorAll('a[href*="/notebook/"]'));
      links.forEach((link, idx) => {
        const href = link.getAttribute('href') || '';
        const idMatch = href.match(/\/notebook\/([^/?]+)/);
        if (!idMatch) return;

        const id = idMatch[1];
        // Get the title from various possible elements
        const titleEl =
          link.querySelector('h3, h2, [class*="title"], [class*="name"]') ||
          link.closest('[class*="card"], [class*="item"]')?.querySelector('h3, h2, [class*="title"]');

        const title = titleEl?.textContent?.trim() ||
          link.getAttribute('aria-label') ||
          link.textContent?.trim() ||
          `Notebook ${idx + 1}`;

        if (id && !results.find(r => r.id === id)) {
          results.push({ id, title, url: href });
        }
      });

      // Strategy 2: Look for project/notebook containers
      if (results.length === 0) {
        const cards = Array.from(document.querySelectorAll(
          '[class*="notebook"], [class*="project"], [data-notebook-id], [data-id]'
        ));
        cards.forEach((card, idx) => {
          const id = card.getAttribute('data-notebook-id') || card.getAttribute('data-id') || `nb-${idx}`;
          const title = card.querySelector('h3, h2, [class*="title"]')?.textContent?.trim() || `Notebook ${idx + 1}`;
          const link = card.querySelector('a');
          if (link) {
            results.push({ id, title, url: link.getAttribute('href') || '' });
          }
        });
      }

      return results;
    });

    await page.close();

    if (notebooks.length === 0) {
      return { notebooks: [], message: 'No notebooks found. Make sure you have notebooks in NotebookLM.' };
    }

    return { notebooks };
  } catch (err) {
    await page.close();
    return { error: err.message };
  }
}

export async function getNotebookFiles(notebookId) {
  const ctx = await getContext();
  const page = await ctx.newPage();

  try {
    const notebookUrl = `${NOTEBOOKLM_URL}notebook/${notebookId}`;
    await page.goto(notebookUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const files = [];

    // Check for Audio Overview
    const hasAudio = await page.locator(
      '[aria-label*="Audio"], [aria-label*="audio"], [class*="audio"], button:has-text("Audio overview"), .audio-overview'
    ).count();

    if (hasAudio > 0) {
      files.push({
        type: 'audio',
        label: 'Audio Overview',
        description: 'סקירת פודקאסט שנוצרה על ידי NotebookLM',
        downloadable: true,
      });
    }

    // Check for Study Guide
    const hasStudyGuide = await page.locator(
      'button:has-text("Study guide"), [aria-label*="Study guide"], [class*="study-guide"]'
    ).count();

    if (hasStudyGuide > 0) {
      files.push({
        type: 'study_guide',
        label: 'Study Guide',
        description: 'מדריך לימוד מפורט',
        downloadable: false, // Text content - will be copied
      });
    }

    // Check for FAQ
    const hasFaq = await page.locator(
      'button:has-text("FAQ"), [aria-label*="FAQ"]'
    ).count();

    if (hasFaq > 0) {
      files.push({
        type: 'faq',
        label: 'FAQ',
        description: 'שאלות ותשובות',
        downloadable: false,
      });
    }

    // Check for Timeline
    const hasTimeline = await page.locator(
      'button:has-text("Timeline"), [aria-label*="Timeline"]'
    ).count();

    if (hasTimeline > 0) {
      files.push({
        type: 'timeline',
        label: 'Timeline',
        description: 'ציר זמן',
        downloadable: false,
      });
    }

    // Check for Briefing Doc
    const hasBriefing = await page.locator(
      'button:has-text("Briefing doc"), [aria-label*="Briefing"]'
    ).count();

    if (hasBriefing > 0) {
      files.push({
        type: 'briefing',
        label: 'Briefing Doc',
        description: 'מסמך סיכום',
        downloadable: false,
      });
    }

    // Always add sources as option
    files.push({
      type: 'sources',
      label: 'Sources List',
      description: 'רשימת המקורות במחברת',
      downloadable: false,
    });

    await page.close();
    return { files, notebookId };
  } catch (err) {
    await page.close();
    return { error: err.message };
  }
}

export async function downloadFile(notebookId, fileType) {
  const ctx = await getContext();
  const page = await ctx.newPage();

  try {
    const notebookUrl = `${NOTEBOOKLM_URL}notebook/${notebookId}`;
    await page.goto(notebookUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    if (fileType === 'audio') {
      return await downloadAudio(page, notebookId);
    } else {
      return await extractTextContent(page, fileType, notebookId);
    }
  } catch (err) {
    await page.close();
    return { error: err.message };
  }
}

async function downloadAudio(page, notebookId) {
  try {
    // Click on Audio Overview section
    const audioSection = page.locator(
      'button:has-text("Audio overview"), [aria-label*="Audio overview"], .audio-overview-button'
    ).first();

    await audioSection.click().catch(() => null);
    await page.waitForTimeout(2000);

    // Look for download button
    const downloadBtn = page.locator(
      '[aria-label*="Download"], button:has-text("Download"), [data-tooltip*="Download"]'
    ).first();

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await downloadBtn.click();
    const download = await downloadPromise;

    const fileName = `audio_${notebookId}_${Date.now()}.wav`;
    const filePath = path.join(DOWNLOADS_DIR, fileName);
    await download.saveAs(filePath);

    await page.close();
    return { success: true, filePath, fileName, fileType: 'audio/wav' };
  } catch (err) {
    await page.close();
    return { error: `Could not download audio: ${err.message}` };
  }
}

async function extractTextContent(page, fileType, notebookId) {
  try {
    // Click on the specific content type button
    const buttonTexts = {
      study_guide: ['Study guide', 'Study Guide'],
      faq: ['FAQ', 'Faq'],
      timeline: ['Timeline'],
      briefing: ['Briefing doc', 'Briefing Doc'],
      sources: ['Sources'],
    };

    const texts = buttonTexts[fileType] || [];

    for (const text of texts) {
      const btn = page.locator(`button:has-text("${text}")`).first();
      const exists = await btn.count();
      if (exists > 0) {
        await btn.click();
        await page.waitForTimeout(2000);
        break;
      }
    }

    // Extract text content from the generated section
    const content = await page.evaluate(() => {
      const contentEl = document.querySelector(
        '[class*="notebook-guide"], [class*="generated-content"], [role="article"], .content-output'
      );
      return contentEl?.innerText || document.body.innerText.substring(0, 5000);
    });

    // Save as text file
    const fileName = `${fileType}_${notebookId}_${Date.now()}.txt`;
    const filePath = path.join(DOWNLOADS_DIR, fileName);
    fs.writeFileSync(filePath, content, 'utf8');

    await page.close();
    return { success: true, filePath, fileName, fileType: 'text/plain' };
  } catch (err) {
    await page.close();
    return { error: err.message };
  }
}

export async function closeBrowser() {
  if (browserContext) {
    await browserContext.close();
    browserContext = null;
    browser = null;
  }
}
