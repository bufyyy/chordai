import { test, expect } from '@playwright/test';

test.describe('ChordAI Complete User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load application and show tutorial on first visit', async ({ page }) => {
    // Clear local storage to simulate first visit
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Check if tutorial appears
    await expect(page.getByText('Welcome to ChordAI')).toBeVisible({ timeout: 5000 });

    // Skip tutorial
    await page.getByRole('button', { name: /skip tutorial/i }).click();

    // Main app should be visible
    await expect(page.getByText('ChordAI')).toBeVisible();
  });

  test('should generate a chord progression', async ({ page }) => {
    // Wait for model to load
    await expect(page.getByText('Model Ready')).toBeVisible({ timeout: 10000 });

    // Select parameters
    await page.selectOption('select[name="genre"]', 'pop');
    await page.selectOption('select[name="mood"]', 'uplifting');
    await page.selectOption('select[name="key"]', 'C');

    // Click generate button
    await page.getByRole('button', { name: /generate/i }).click();

    // Wait for progression to appear
    await expect(page.locator('[data-testid="chord-display"]').first()).toBeVisible({
      timeout: 5000
    });

    // Check that chords are displayed
    const chords = page.locator('[data-testid="chord-display"]');
    await expect(chords).toHaveCount(4, { timeout: 5000 });
  });

  test('should play audio when play button clicked', async ({ page }) => {
    // Generate progression first
    await page.getByRole('button', { name: /generate/i }).click();
    await page.waitForTimeout(2000);

    // Click play button
    const playButton = page.getByRole('button', { name: /play/i });
    await playButton.click();

    // Check if stop button appears (indicating playback started)
    await expect(page.getByRole('button', { name: /stop/i })).toBeVisible({
      timeout: 2000
    });
  });

  test('should open and use library', async ({ page }) => {
    // Click library button
    await page.getByRole('button', { name: /library/i }).click();

    // Library modal should appear
    await expect(page.getByText('Progression Library')).toBeVisible();

    // Search for a progression
    await page.fill('input[placeholder*="Search"]', 'Axis');

    // Click on a progression to load it
    const progression = page.getByText(/Axis of Awesome/i).first();
    await progression.click();

    // Load button should be visible
    const loadButton = page.locator('button[aria-label="Load progression"]').first();
    await loadButton.click();

    // Check for success toast
    await expect(page.getByText(/loaded/i)).toBeVisible({ timeout: 3000 });
  });

  test('should open settings and change parameters', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: /settings/i }).click();

    // Settings modal should appear
    await expect(page.getByText('Settings')).toBeVisible();

    // Change audio quality
    await page.selectOption('select', 'medium');

    // Go to Data tab
    await page.getByRole('button', { name: 'data' }).click();

    // Check storage usage is displayed
    await expect(page.getByText(/storage usage/i)).toBeVisible();

    // Close settings
    await page.keyboard.press('Escape');
    await expect(page.getByText('Settings')).not.toBeVisible();
  });

  test('should save progression to favorites', async ({ page }) => {
    // Generate progression
    await page.getByRole('button', { name: /generate/i }).click();
    await page.waitForTimeout(2000);

    // Click favorite/star button
    const starButton = page.locator('button[aria-label*="favorite"]').first();
    await starButton.click();

    // Check for success toast
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 3000 });

    // Open sidebar to check favorites
    // (Assuming sidebar opens favorites section)
    await page.getByRole('button', { name: /history/i }).click();
    await expect(page.getByText(/favorites/i)).toBeVisible();
  });

  test('should export progression', async ({ page }) => {
    // Generate progression
    await page.getByRole('button', { name: /generate/i }).click();
    await page.waitForTimeout(2000);

    // Click export button
    await page.getByRole('button', { name: /export/i }).click();

    // Export menu should appear
    await expect(page.getByText(/download as/i)).toBeVisible();

    // Click TXT export
    const downloadPromise = page.waitForEvent('download');
    await page.getByText(/txt/i).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.txt');
  });

  test('should use keyboard shortcuts', async ({ page }) => {
    // Press L to open library
    await page.keyboard.press('l');
    await expect(page.getByText('Progression Library')).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(page.getByText('Progression Library')).not.toBeVisible();

    // Press Ctrl+S to open settings
    await page.keyboard.press('Control+s');
    await expect(page.getByText('Settings')).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
  });

  test('should filter library by genre', async ({ page }) => {
    // Open library
    await page.getByRole('button', { name: /library/i }).click();

    // Click Jazz genre filter
    await page.getByRole('button', { name: 'jazz' }).click();

    // Check that only jazz progressions are shown
    await expect(page.getByText(/ii-V-I/i)).toBeVisible();

    // Pop progressions should not be visible
    // (This depends on your specific progression names)
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Simulate network error by going offline
    await page.context().setOffline(true);

    // Try to generate
    await page.getByRole('button', { name: /generate/i }).click();

    // Error toast should appear
    await expect(page.getByText(/error/i)).toBeVisible({ timeout: 5000 });

    // Go back online
    await page.context().setOffline(false);
  });

  test('should persist data in localStorage', async ({ page }) => {
    // Generate and save a progression
    await page.getByRole('button', { name: /generate/i }).click();
    await page.waitForTimeout(2000);

    // Check localStorage has data
    const storageData = await page.evaluate(() => {
      return {
        history: localStorage.getItem('chordai_history'),
        settings: localStorage.getItem('chordai_settings'),
      };
    });

    expect(storageData.history).toBeTruthy();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that main elements are still visible and functional
    await expect(page.getByText('ChordAI')).toBeVisible();
    await expect(page.getByRole('button', { name: /generate/i })).toBeVisible();

    // Menu button should be visible on mobile
    await page.getByRole('button', { name: /library/i }).click();
    await expect(page.getByText('Progression Library')).toBeVisible();
  });

  test('should complete full workflow: generate, play, export, save', async ({ page }) => {
    // 1. Generate progression
    await page.selectOption('select[name="genre"]', 'rock');
    await page.getByRole('button', { name: /generate/i }).click();
    await page.waitForTimeout(2000);

    // 2. Play audio
    await page.getByRole('button', { name: /play/i }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /stop/i }).click();

    // 3. Export as JSON
    await page.getByRole('button', { name: /export/i }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByText(/json/i).click();
    await downloadPromise;

    // 4. Save to favorites
    const starButton = page.locator('button[aria-label*="favorite"]').first();
    await starButton.click();

    // 5. Verify success
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 3000 });
  });
});
