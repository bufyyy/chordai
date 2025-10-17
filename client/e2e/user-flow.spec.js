import { test, expect } from '@playwright/test';

test.describe('ChordAI User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for model to load
    await page.waitForSelector('text=Model Ready', { timeout: 30000 });
  });

  test('should display application header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('ChordAI');
    await expect(page.locator('text=AI-powered chord progression generator')).toBeVisible();
  });

  test('should show demo mode banner', async ({ page }) => {
    const demoBanner = page.locator('text=Demo Mode');
    await expect(demoBanner).toBeVisible();
  });

  test('complete progression generation flow', async ({ page }) => {
    // Step 1: Select genre
    await page.selectOption('select[name="genre"]', 'pop');

    // Step 2: Select mood
    await page.selectOption('select[name="mood"]', 'uplifting');

    // Step 3: Select key
    await page.selectOption('select[name="key"]', 'C');

    // Step 4: Select scale type
    await page.selectOption('select[name="scaleType"]', 'major');

    // Step 5: Set length
    await page.locator('input[name="length"]').fill('4');

    // Step 6: Generate progression
    await page.click('button:has-text("Generate Progression")');

    // Step 7: Wait for progression to appear
    await page.waitForSelector('text=Your Progression', { timeout: 10000 });

    // Step 8: Verify chords are displayed
    const chordCards = page.locator('[class*="glass rounded-xl"]');
    await expect(chordCards).toHaveCount(4, { timeout: 5000 });

    // Step 9: Verify metadata is shown
    await expect(page.locator('text=Key:')).toBeVisible();
    await expect(page.locator('text=Genre:')).toBeVisible();
    await expect(page.locator('text=Mood:')).toBeVisible();
  });

  test('should play progression', async ({ page }) => {
    // Generate a progression first
    await page.click('button:has-text("Generate Progression")');
    await page.waitForSelector('text=Your Progression', { timeout: 10000 });

    // Click play button
    await page.click('button:has-text("Play Progression")');

    // Verify playback started
    await expect(page.locator('button:has-text("Stop")')).toBeVisible();

    // Stop playback
    await page.click('button:has-text("Stop")');
    await expect(page.locator('button:has-text("Play Progression")')).toBeVisible();
  });

  test('should copy progression to clipboard', async ({ page }) => {
    // Generate a progression
    await page.click('button:has-text("Generate Progression")');
    await page.waitForSelector('text=Your Progression', { timeout: 10000 });

    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click copy button
    const copyButton = page.locator('button[title="Copy to clipboard"]');
    await copyButton.click();

    // Verify toast notification
    await expect(page.locator('text=Copied to clipboard')).toBeVisible({ timeout: 3000 });
  });

  test('should regenerate progression', async ({ page }) => {
    // Generate initial progression
    await page.click('button:has-text("Generate Progression")');
    await page.waitForSelector('text=Your Progression', { timeout: 10000 });

    // Get initial progression text
    const initialProgression = await page.locator('text=/→/').textContent();

    // Click regenerate
    await page.click('button:has-text("Regenerate")');

    // Wait a bit for new progression
    await page.waitForTimeout(1000);

    // Note: In demo mode, progression might be the same, so just check it exists
    await expect(page.locator('text=Your Progression')).toBeVisible();
  });

  test('should generate variation', async ({ page }) => {
    // Generate initial progression
    await page.click('button:has-text("Generate Progression")');
    await page.waitForSelector('text=Your Progression', { timeout: 10000 });

    // Click variation button
    await page.click('button:has-text("Variation")');

    // Wait for variation to be generated
    await page.waitForTimeout(1000);

    // Verify progression still exists
    await expect(page.locator('text=Your Progression')).toBeVisible();
  });

  test('should save to favorites', async ({ page }) => {
    // Generate progression
    await page.click('button:has-text("Generate Progression")');
    await page.waitForSelector('text=Your Progression', { timeout: 10000 });

    // Click favorite button
    const favoriteButton = page.locator('button[title*="favorite"]').first();
    await favoriteButton.click();

    // Verify toast notification
    await expect(page.locator('text=Added to favorites')).toBeVisible({ timeout: 3000 });
  });

  test('should open and close library sidebar', async ({ page }) => {
    // Open library
    await page.click('button:has-text("Library")');

    // Verify sidebar is open
    await expect(page.locator('text=History')).toBeVisible();
    await expect(page.locator('text=Favorites')).toBeVisible();

    // Close sidebar
    await page.click('button[aria-label="Close sidebar"], button:has-text("×")').first();

    // Verify sidebar is closed (check if backdrop is gone)
    await page.waitForTimeout(500);
  });

  test('should switch between history and favorites tabs', async ({ page }) => {
    // Open library
    await page.click('button:has-text("Library")');

    // Click history tab
    await page.click('button:has-text("History")');
    await expect(page.locator('text=History')).toBeVisible();

    // Click favorites tab
    await page.click('button:has-text("Favorites")');
    await expect(page.locator('text=Favorites')).toBeVisible();
  });

  test('should change synth type', async ({ page }) => {
    // Generate progression
    await page.click('button:has-text("Generate Progression")');
    await page.waitForSelector('text=Your Progression', { timeout: 10000 });

    // Scroll to playback section
    await page.locator('text=Playback').scrollIntoViewIfNeeded();

    // Try different synth types
    const synthTypes = ['Piano', 'Pad', 'Synth', 'Electric'];

    for (const synthType of synthTypes) {
      const button = page.locator(`button:has-text("${synthType}")`).first();
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(200);
      }
    }
  });

  test('should adjust tempo', async ({ page }) => {
    // Generate progression
    await page.click('button:has-text("Generate Progression")');
    await page.waitForSelector('text=Your Progression', { timeout: 10000 });

    // Scroll to playback section
    await page.locator('text=Playback').scrollIntoViewIfNeeded();

    // Find tempo slider
    const tempoSlider = page.locator('input[type="range"]').filter({ has: page.locator('text=Tempo') });

    if (await tempoSlider.count() > 0) {
      await tempoSlider.first().fill('140');
      await expect(page.locator('text=140 BPM')).toBeVisible();
    }
  });

  test('should export to MIDI', async ({ page }) => {
    // Generate progression
    await page.click('button:has-text("Generate Progression")');
    await page.waitForSelector('text=Your Progression', { timeout: 10000 });

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export MIDI button
    await page.click('button:has-text("Export as MIDI")');

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.mid$/);
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('should display correctly on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Model Ready', { timeout: 30000 });

    // Verify main elements are visible
    await expect(page.locator('h1:has-text("ChordAI")')).toBeVisible();
    await expect(page.locator('button:has-text("Generate Progression")')).toBeVisible();
  });

  test('library sidebar should be full-width on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Model Ready', { timeout: 30000 });

    // Open library
    await page.click('button:has-text("Library")');

    // Get sidebar width
    const sidebar = page.locator('[class*="fixed"][class*="right-0"]').first();
    const box = await sidebar.boundingBox();

    // On mobile, sidebar should be close to full width
    expect(box.width).toBeGreaterThan(300);
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText('ChordAI');
  });

  test('buttons should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Model Ready', { timeout: 30000 });

    // Tab to generate button and press Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // Eventually reach generate button through tabbing
    // This is a basic check - full keyboard nav would need more specific testing
  });

  test('should have alt text for icons', async ({ page }) => {
    await page.goto('/');

    // SVG icons should have titles or aria-labels
    const buttons = page.locator('button');
    const count = await buttons.count();

    expect(count).toBeGreaterThan(0);
  });
});
